package com.example.report_system.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.sql.DataSource;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.StringReader;
import java.math.BigDecimal;
import java.sql.*;
import java.util.*;

@Service
public class ExcelUploadService {

    private final DataSource dataSource;
    private final ObjectMapper objectMapper;

    public ExcelUploadService(DataSource dataSource) {
        this.dataSource = dataSource;
        this.objectMapper = new ObjectMapper()
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS);
    }

    // ── Main method — upload + procedure + export ─────────
    public byte[] uploadExcel(MultipartFile file, UUID repId, String username) throws Exception {
        String fileName = file.getOriginalFilename();
        if (fileName == null || (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls"))) {
            throw new RuntimeException("Faqat .xlsx yoki .xls formatida fayl yuklang!");
        }

        List<Map<String, Object>> rows = readExcel(file, fileName);

        try (Connection conn = dataSource.getConnection()) {
            byte[] guid = getSysGuid(conn);
            insertToGtt(conn, repId, guid, rows);

            String errMsg = callImportProcedure(conn, guid, repId, username);
            if (errMsg != null && !errMsg.isBlank()) {
                throw new RuntimeException("Procedure xatosi: " + errMsg);
            }

            Map<Integer, Map<String, Object>> resultRows = readFromTmp(conn);
            String templatePath = getTemplatePath(conn, repId);
            return exportToExcel(templatePath, resultRows);
        }
    }

    // ── REP_CORE_TMP dan o'qish ───────────────────────────
    private Map<Integer, Map<String, Object>> readFromTmp(Connection conn) throws Exception {
        Map<Integer, Map<String, Object>> rowsMap = new LinkedHashMap<>();
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT ROW_NUMBER, DATA FROM REP_CORE_TMP ORDER BY ROW_NUMBER");
             ResultSet rs = ps.executeQuery()) {
            int count = 0;
            while (rs.next()) {
                count++;
                int rowNumber = rs.getInt("ROW_NUMBER");
                String jsonStr = rs.getString("DATA");
                Map<String, Object> jsonData = objectMapper.readValue(
                        jsonStr, new TypeReference<>() {});
                rowsMap.put(rowNumber, jsonData);
            }
        }
        return rowsMap;
    }

    // ── Template path — xuddi shu connection dan ──────────
    private String getTemplatePath(Connection conn, UUID repId) throws Exception {
        // Avval hex ni log qiling
        String hexId = repId.toString().replace("-", "").toUpperCase();

        // HEXTORAW o'rniga to'g'ridan-to'g'ri bytes bilan qidiring
        String sql = "SELECT template FROM rep_core_name WHERE id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setBytes(1, uuidToBytes(repId));
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    String path = rs.getString(1);
                    return path;
                }
            }
        }
        throw new RuntimeException("Template topilmadi repId: " + repId + " hex: " + hexId);
    }

    // ── Excel export ───────────────────────────────────────
    private byte[] exportToExcel(String templatePath,
                                 Map<Integer, Map<String, Object>> rowsMap) throws Exception {
        if (rowsMap.isEmpty()) {
            try (XSSFWorkbook wb = new XSSFWorkbook();
                 ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
                wb.createSheet("Result");
                wb.write(bos);
                return bos.toByteArray();
            }
        }

        try (InputStream fis = loadTemplate(templatePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            Sheet sheet = workbook.getSheetAt(0);
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();

            int templateRowIndex = findDataStartRow(sheet, evaluator);
            Row templateRow = sheet.getRow(templateRowIndex);
            int baseOffset = rowsMap.keySet().iterator().next() - 1;

            for (Map.Entry<Integer, Map<String, Object>> entry : rowsMap.entrySet()) {
                int excelRowIndex = templateRowIndex + (entry.getKey() - baseOffset);
                Row dataRow = sheet.createRow(excelRowIndex);
                writeRowData(dataRow, entry.getValue(), templateRow, evaluator);
            }

            sheet.removeRow(templateRow);

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);
            return bos.toByteArray();
        }
    }

    // ── Template yuklash — disk → classpath ───────────────
    // Disk dan o'qish: har safar yangi fayl, cache yo'q
    private InputStream loadTemplate(String templatePath) throws Exception {
        // 1. Absolut yo'l bo'lsa — to'g'ridan-to'g'ri diskdan
        java.io.File absFile = new java.io.File(templatePath);
        if (absFile.isAbsolute() && absFile.exists()) {
            return new java.io.FileInputStream(absFile);
        }

        // 2. templates/ papkasidan diskda qidiramiz (jar yonida)
        java.io.File diskFile = new java.io.File("templates/" + templatePath);
        if (diskFile.exists()) {
            return new java.io.FileInputStream(diskFile);
        }

        // 3. Fallback — classpath (development uchun)
        return new ClassPathResource("templates/" + templatePath).getInputStream();
    }

    // ── Template row topish ────────────────────────────────
    private int findDataStartRow(Sheet sheet, FormulaEvaluator evaluator) {
        for (Row row : sheet) {
            for (Cell cell : row) {
                String val = getEvaluatedStringValue(cell, evaluator);
                if (val != null && val.startsWith("{") && val.endsWith("}")) {
                    return row.getRowNum();
                }
            }
        }
        return 1;
    }

    // ── Row data yozish ────────────────────────────────────
    private void writeRowData(Row targetRow,
                              Map<String, Object> jsonData,
                              Row templateRow,
                              FormulaEvaluator evaluator) {
        if (templateRow == null) return;
        for (Cell templateCell : templateRow) {
            String placeholder = getEvaluatedStringValue(templateCell, evaluator);
            if (placeholder == null || !placeholder.startsWith("{") || !placeholder.endsWith("}")) continue;

            String key = placeholder.substring(1, placeholder.length() - 1);
            Object value = jsonData.get(key);

            if (value == null) {
                for (Map.Entry<String, Object> e : jsonData.entrySet()) {
                    if (e.getKey().equalsIgnoreCase(key)) { value = e.getValue(); break; }
                }
            }

            Cell newCell = targetRow.createCell(templateCell.getColumnIndex());
            newCell.setCellStyle(templateCell.getCellStyle());

            if (value == null) {
                newCell.setBlank();
            } else if (value instanceof Number) {
                newCell.setCellValue(((Number) value).doubleValue());
            } else {
                newCell.setCellValue(value.toString());
            }
        }
    }

    // ── Formula evaluate qilib string olish ───────────────
    private String getEvaluatedStringValue(Cell cell, FormulaEvaluator evaluator) {
        if (cell == null) return null;
        try {
            CellValue cellValue = evaluator.evaluate(cell);
            if (cellValue == null) return null;
            return switch (cellValue.getCellType()) {
                case STRING  -> cellValue.getStringValue();
                case NUMERIC -> String.valueOf((long) cellValue.getNumberValue());
                default      -> null;
            };
        } catch (Exception e) {
            if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
            return null;
        }
    }

    // ── Excel o'qish ──────────────────────────────────────
    private List<Map<String, Object>> readExcel(MultipartFile file, String fileName) throws Exception {
        try (InputStream is = file.getInputStream()) {
            Workbook workbook = fileName.endsWith(".xlsx")
                    ? new XSSFWorkbook(is)
                    : new HSSFWorkbook(is);

            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) throw new RuntimeException("Fayl bo'sh!");

            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                String header = cell.toString().trim();
                if (!header.isEmpty()) headers.add(header);
            }

            List<Map<String, Object>> rows = new ArrayList<>();
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Map<String, Object> rowData = new LinkedHashMap<>();
                boolean hasData = false;
                for (int j = 0; j < headers.size(); j++) {
                    Cell cell = row.getCell(j, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    Object value = getCellValue(cell);
                    rowData.put(headers.get(j), value);
                    if (value != null) hasData = true;
                }
                if (hasData) rows.add(rowData);
            }
            return rows;
        }
    }

    // ── SYS_GUID() olish ──────────────────────────────────
    private byte[] getSysGuid(Connection conn) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("SELECT SYS_GUID() FROM DUAL");
             ResultSet rs = ps.executeQuery()) {
            rs.next();
            return rs.getBytes(1);
        }
    }

    // ── GTT ga INSERT ─────────────────────────────────────
    private void insertToGtt(Connection conn,
                             UUID repId,
                             byte[] guid,
                             List<Map<String, Object>> rows) throws Exception {
        String sql = "INSERT INTO REP_CORE_EXCEL_TMP (ID, REP_ID, ROW_NUMBER, IMPORT_DATA) VALUES (?, ?, ?, ?)";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < rows.size(); i++) {
                String json = objectMapper.writeValueAsString(rows.get(i));
                ps.setBytes(1, guid);                // ID     → SYS_GUID byte[]
                ps.setBytes(2, uuidToBytes(repId));  // REP_ID → UUID → byte[]
                ps.setInt(3, i + 1);                 // ROW_NUMBER
                ps.setClob(4, new StringReader(json)); // IMPORT_DATA
                ps.addBatch();
                if ((i + 1) % 500 == 0) ps.executeBatch();
            }
            ps.executeBatch();
        }
    }

    // ── Import_Excel procedure ────────────────────────────
    private String callImportProcedure(Connection conn,
                                       byte[] guid,
                                       UUID repId,
                                       String username) throws Exception {
        long userId = getUserId(conn, username);
        byte[] repIdBytes = uuidToBytes(repId);


        String sql = "BEGIN REP_CORE_UTIL.Import_Excel(?, ?, ?, ?); END;";
        try (CallableStatement stmt = conn.prepareCall(sql)) {
            stmt.setBytes(1, repIdBytes);
            stmt.setBytes(2, guid);
            stmt.setLong(3, userId);
            stmt.registerOutParameter(4, Types.VARCHAR);
            stmt.execute();
            return stmt.getString(4);
        }
    }

    // ── Username → user_id ────────────────────────────────
    private long getUserId(Connection conn, String username) throws Exception {
        String sql = "SELECT id FROM rep_core_users WHERE username = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return rs.getLong(1);
            }
        }
        throw new RuntimeException("Foydalanuvchi topilmadi: " + username);
    }

    // ── UUID → byte[16] ───────────────────────────────────
    private byte[] uuidToBytes(UUID uuid) {
        long msb = uuid.getMostSignificantBits();
        long lsb = uuid.getLeastSignificantBits();
        byte[] bytes = new byte[16];
        for (int i = 7; i >= 0; i--) {
            bytes[i]     = (byte) (msb & 0xFF); msb >>= 8;
            bytes[i + 8] = (byte) (lsb & 0xFF); lsb >>= 8;
        }
        return bytes;
    }

    // ── Cell qiymatini olish ──────────────────────────────
    private Object getCellValue(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) yield cell.getDateCellValue();
                yield toCleanNumber(cell.getNumericCellValue());
            }
            case STRING -> {
                String raw = cell.getStringCellValue().trim();
                if (raw.isEmpty()) yield null;
                // Faqat vergul bilan formatlangan son bo'lsa convert qilamiz
                // Masalan: "90,000,000.00" → 90000000L
                // "1490100099900931" → string sifatida qoladi
                if (raw.contains(",")) {
                    String cleaned = raw.replace(",", "");
                    try {
                        yield toCleanNumber(new BigDecimal(cleaned).doubleValue());
                    } catch (NumberFormatException e) {
                        yield raw;
                    }
                }
                yield raw;
            }
            case BOOLEAN -> cell.getBooleanCellValue();
            case FORMULA -> {
                try {
                    yield toCleanNumber(cell.getNumericCellValue());
                } catch (Exception e) {
                    yield cell.getStringCellValue();
                }
            }
            default -> null;
        };
    }

    // ── Double → Long yoki BigDecimal ─────────────────────
    private Object toCleanNumber(double d) {
        if (Double.isInfinite(d) || Double.isNaN(d)) return d;
        BigDecimal bd = BigDecimal.valueOf(d);
        try {
            return bd.longValueExact();
        } catch (ArithmeticException e) {
            return bd.stripTrailingZeros();
        }
    }

    // ── Bytes to Hex ──────────────────────────────────────
    private String bytesToHex(byte[] bytes) {
        if (bytes == null) return "null";
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02X", b));
        return sb.toString();
    }


}