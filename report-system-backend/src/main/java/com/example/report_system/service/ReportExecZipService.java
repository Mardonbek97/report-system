package com.example.report_system.service;

import com.example.report_system.dto.ExecuteReportRequestDto;
import com.example.report_system.dto.ReportParamsDto;
import com.example.report_system.dto.ReportParamsExecDto;
import com.example.report_system.entity.Reports;
import com.example.report_system.entity.Users;
import com.example.report_system.repository.ReportRepository;
import com.example.report_system.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ReportExecZipService {

    private final ReportRepository reportRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ExcelExportService excelExportService;
    private final DataSource dataSource;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final UserRepository userRepository;

    public ReportExecZipService(ReportRepository reportRepository,
                                JdbcTemplate jdbcTemplate,
                                ExcelExportService excelExportService,
                                DataSource dataSource,
                                UserRepository userRepository) {
        this.reportRepository = reportRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.excelExportService = excelExportService;
        this.dataSource = dataSource;
        this.userRepository = userRepository;
    }
    public record ExportResult(byte[] bytes, String extension) {}
    private static final int MAX_ROWS_PER_FILE = 2_000;

    // ── Template yuklash — disk → classpath ───────────────
    @Value("${report.template.dir}")
    private String templateDir;

    private InputStream loadTemplate(String templatePath) throws Exception {
        // 1. Absolut yo'l (to'liq yo'l berilgan bo'lsa)
        File absFile = new File(templatePath);
        if (absFile.isAbsolute() && absFile.exists()) {
            return new FileInputStream(absFile);
        }
        // 2. application.properties dan templateDir + templatePath
        File dirFile = new File(templateDir + templatePath);
        if (dirFile.exists()) {
            return new FileInputStream(dirFile);
        }
        // 3. Fallback — classpath (dev uchun)
        return new ClassPathResource("templates/" + templatePath).getInputStream();
    }

    // ── Params ────────────────────────────────────────────
    public List<ReportParamsExecDto> getParams(UUID repId) {
        List<ReportParamsDto> rawList = reportRepository.findByIdParams(repId);

        return rawList.stream()
                .map(p -> {
                    String defaultVal = null;
                    List<Map<String, Object>> options = null;
                    String sql = p.defaultValue();

                    if (sql != null && !sql.isBlank()) {
                        try {
                            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
                            if (rows.size() == 1 && rows.get(0).size() == 1) {
                                defaultVal = String.valueOf(rows.get(0).values().iterator().next());
                            } else {
                                options = rows.stream().map(row -> {
                                    Map<String, Object> item = new LinkedHashMap<>();
                                    List<Map.Entry<String, Object>> entries = new ArrayList<>(row.entrySet());
                                    item.put("id", entries.get(0).getValue());
                                    item.put("name", entries.size() > 1
                                            ? entries.get(1).getValue()
                                            : entries.get(0).getValue());
                                    return item;
                                }).collect(Collectors.toList());
                            }
                        } catch (Exception e) {
                            System.out.println("=== DEF_VALUE SQL xato: " + e.getMessage());
                        }
                    }

                    return new ReportParamsExecDto(
                            p.paramName(), p.paramType(), p.paramView(), defaultVal, options);
                })
                .collect(Collectors.toList());
    }

    // ── Execute & Export ──────────────────────────────────
    public ExportResult executeAndExportZip(ExecuteReportRequestDto request) throws Exception {
        Optional<Users> user = userRepository.findByUsername(request.username());
        Optional<Reports> report = reportRepository.findById(request.repId());
        String templatePath = report.get().getTemplate();
        String format = request.fileFormat() != null ? request.fileFormat() : "xlsx";
        String baseName = templatePath.contains(".")
                ? templatePath.substring(0, templatePath.lastIndexOf("."))
                : templatePath;

        try (Connection conn = dataSource.getConnection()) {
            Map<Integer, Map<String, Object>> rowsMap = new LinkedHashMap<>();

            // 1. Procedure run
            String sql = "BEGIN REP_CORE_UTIL.EXECUTE_PROC(HEXTORAW(?), ?, ?, ?); END;";
            try (CallableStatement stmt = conn.prepareCall(sql)) {
                String hexUuid = request.repId().toString().replace("-", "").toUpperCase();
                stmt.setString(1, hexUuid);
                stmt.setLong(2, user.get().getId());

                List<ReportParamsDto> paramDefs = reportRepository.findByIdParams(request.repId())
                        .stream()
                        .map(p -> new ReportParamsDto(
                                p.paramName(), p.paramType(), p.paramView(), p.defaultValue()))
                        .collect(Collectors.toUnmodifiableList());

                String paramsJson = buildParamsJson(paramDefs, request.params());
                stmt.setClob(3, new StringReader(paramsJson));
                stmt.registerOutParameter(4, Types.VARCHAR);
                stmt.execute();

                String errMsg = stmt.getString(4);
                if (errMsg != null && !errMsg.isBlank()) {
                    throw new RuntimeException("Procedure xatosi: " + errMsg);
                }
            }

            // 2. Temp tabladan o'qish
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT ROW_NUMBER, DATA FROM REP_CORE_TMP ORDER BY 1");
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int rowNumber = rs.getInt("ROW_NUMBER");
                    String jsonStr = rs.getString("DATA");
                    Map<String, Object> jsonData = objectMapper.readValue(
                            jsonStr, new TypeReference<Map<String, Object>>() {});
                    rowsMap.put(rowNumber, jsonData);
                }
            }

            int totalRows = rowsMap.size();

            // Bo'sh natija — bo'sh zip
            if (totalRows == 0) {
                return new ExportResult(wrapInZip(List.of()), "zip");
            }

            int fileCount = (int) Math.ceil((double) totalRows / MAX_ROWS_PER_FILE);

            // ✅ Bitta fayl — to'g'ridan xlsx/docx/txt qaytaramiz
            if (fileCount <= 1) {
                byte[] fileBytes = generateByFormat(templatePath, rowsMap, format);
                return new ExportResult(fileBytes, format);
            }

            // Ko'p fayl — zip ichiga
            List<Map.Entry<String, byte[]>> files = new ArrayList<>();
            List<Map.Entry<Integer, Map<String, Object>>> allEntries =
                    new ArrayList<>(rowsMap.entrySet());

            for (int i = 0; i < fileCount; i++) {
                int fromIndex = i * MAX_ROWS_PER_FILE;
                int toIndex = Math.min(fromIndex + MAX_ROWS_PER_FILE, totalRows);

                Map<Integer, Map<String, Object>> partMap = new LinkedHashMap<>();
                for (Map.Entry<Integer, Map<String, Object>> e : allEntries.subList(fromIndex, toIndex)) {
                    partMap.put(e.getKey(), e.getValue());
                }

                byte[] fileBytes = generateByFormat(templatePath, partMap, format);
                files.add(Map.entry(baseName + "_" + (i + 1) + "." + format, fileBytes));
            }

            return new ExportResult(wrapInZip(files), "zip");

        } catch (Exception e) {
            throw new RuntimeException("Xato: " + e.getMessage(), e);
        }
    }

    // ── Generate Excel ────────────────────────────────────
    private byte[] generateExcel(String templatePath,
                                 Map<Integer, Map<String, Object>> rowsMap) throws Exception {
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

    // ── Find template row ─────────────────────────────────
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

    // ── Write row data ────────────────────────────────────
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

    // ── Generate Word ─────────────────────────────────────
    private byte[] generateWord(String templatePath,
                                Map<Integer, Map<String, Object>> rowsMap) throws Exception {
        try (InputStream fis = loadTemplate(templatePath)) {
            byte[] bytes = fis.readAllBytes();
            XWPFDocument doc = bytes.length == 0
                    ? new XWPFDocument()
                    : new XWPFDocument(new ByteArrayInputStream(bytes));

            for (Map.Entry<Integer, Map<String, Object>> entry : rowsMap.entrySet()) {
                StringBuilder line = new StringBuilder();
                for (Map.Entry<String, Object> field : entry.getValue().entrySet()) {
                    line.append(field.getKey()).append(": ")
                            .append(field.getValue() != null ? field.getValue() : "")
                            .append("   ");
                }
                XWPFParagraph paragraph = doc.createParagraph();
                XWPFRun run = paragraph.createRun();
                run.setText(line.toString());
                run.setFontSize(10);
            }

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            doc.write(bos);
            return bos.toByteArray();
        }
    }

    // ── Generate Text ─────────────────────────────────────
    private byte[] generateText(String templatePath,
                                Map<Integer, Map<String, Object>> rowsMap) throws Exception {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<Integer, Map<String, Object>> entry : rowsMap.entrySet()) {
            StringBuilder line = new StringBuilder();
            for (Map.Entry<String, Object> field : entry.getValue().entrySet()) {
                line.append(field.getKey()).append(": ")
                        .append(field.getValue() != null ? field.getValue() : "")
                        .append("   ");
            }
            sb.append(line).append("\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    // ── Generate by format ────────────────────────────────
    private byte[] generateByFormat(String templatePath,
                                    Map<Integer, Map<String, Object>> rowsMap,
                                    String format) throws Exception {
        return switch (format.toLowerCase()) {
            case "docx" -> generateWord(templatePath, rowsMap);
            case "txt"  -> generateText(templatePath, rowsMap);
            default     -> generateExcel(templatePath, rowsMap);
        };
    }

    // ── Wrap in ZIP ───────────────────────────────────────
    private byte[] wrapInZip(List<Map.Entry<String, byte[]>> files) throws Exception {
        ByteArrayOutputStream zipBos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(zipBos)) {
            for (Map.Entry<String, byte[]> file : files) {
                ZipEntry entry = new ZipEntry(file.getKey());
                zos.putNextEntry(entry);
                zos.write(file.getValue());
                zos.closeEntry();
            }
        }
        return zipBos.toByteArray();
    }

    // ── Build params JSON ─────────────────────────────────
    private String buildParamsJson(List<ReportParamsDto> paramDefs,
                                   Map<String, String> frontendValues) {
        StringBuilder json = new StringBuilder("{");
        for (int i = 0; i < paramDefs.size(); i++) {
            ReportParamsDto def = paramDefs.get(i);
            String rawValue = frontendValues.get(def.paramName());
            String convertedValue = convertValue(def.paramType(), rawValue);
            json.append("\"").append(def.paramName()).append("\":");
            json.append(convertedValue);
            if (i < paramDefs.size() - 1) json.append(",");
        }
        json.append("}");
        return json.toString();
    }

    // ── Convert value ─────────────────────────────────────
    private String convertValue(String type, String value) {
        if (value == null || value.isBlank()) return "null";
        return switch (type.toLowerCase()) {
            case "date", "varchar2", "varchar", "string" -> "\"" + value + "\"";
            case "number", "integer", "int" -> value;
            default -> "\"" + value + "\"";
        };
    }

    // ── UUID to bytes ─────────────────────────────────────
    private byte[] uuidToBytes(UUID uuid) {
        ByteBuffer bb = ByteBuffer.wrap(new byte[16]);
        bb.putLong(uuid.getMostSignificantBits());
        bb.putLong(uuid.getLeastSignificantBits());
        return bb.array();
    }

    private Row getOrCreateRow(Sheet sheet, int rowIndex) {
        Row row = sheet.getRow(rowIndex);
        return row != null ? row : sheet.createRow(rowIndex);
    }

    private XWPFTableRow cloneRow(XWPFTable table, XWPFTableRow sourceRow) throws Exception {
        org.openxmlformats.schemas.wordprocessingml.x2006.main.CTRow ctRow =
                org.openxmlformats.schemas.wordprocessingml.x2006.main.CTRow.Factory
                        .parse(sourceRow.getCtRow().xmlText());
        return new XWPFTableRow(ctRow, table);
    }

    private void fillRowPlaceholders(XWPFTableRow row, Map<String, Object> data) {
        for (XWPFTableCell cell : row.getTableCells()) {
            for (XWPFParagraph para : cell.getParagraphs()) {
                for (XWPFRun run : para.getRuns()) {
                    String text = run.getText(0);
                    if (text != null && text.contains("{{")) {
                        for (Map.Entry<String, Object> entry : data.entrySet()) {
                            text = text.replace(
                                    "{{" + entry.getKey() + "}}",
                                    entry.getValue() != null ? String.valueOf(entry.getValue()) : ""
                            );
                        }
                        run.setText(text, 0);
                    }
                }
            }
        }
    }
}