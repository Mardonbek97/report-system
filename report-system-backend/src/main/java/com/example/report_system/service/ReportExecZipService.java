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
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.StringReader;
import java.nio.ByteBuffer;
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

    private static final int MAX_ROWS_PER_FILE = 2_000;

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
    public byte[] executeAndExportZip(ExecuteReportRequestDto request) throws Exception {
        Optional<Users> user = userRepository.findByUsername(request.username());
        Optional<Reports> report = reportRepository.findById(request.repId());
        String templatePath = report.get().getTemplate();
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

            // 2. Temp tabladan o'qiymiz — Oracle ROW_NUMBER saqlanadi
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT ROW_NUMBER, DATA FROM REP_CORE_TMP ORDER BY 1");
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int rowNumber = rs.getInt("ROW_NUMBER");
                    String jsonStr = rs.getString("DATA");
                    Map<String, Object> jsonData = objectMapper.readValue(
                            jsonStr, new TypeReference<Map<String, Object>>() {
                            });
                    rowsMap.put(rowNumber, jsonData);
                }
            }

            int totalRows = rowsMap.size();
            System.out.println("=== Jami qatorlar: " + totalRows);

            int fileCount = (int) Math.ceil((double) totalRows / MAX_ROWS_PER_FILE);
            System.out.println("=== Fayllar soni: " + fileCount);

            // 3. Bitta fayl
            if (fileCount <= 1) {
                byte[] excelBytes = generateExcel(templatePath, rowsMap);
                return wrapInZip(List.of(Map.entry(baseName + ".xlsx", excelBytes)));
            }

            // 4. Ko'p fayl — Oracle row number saqlab bo'lamiz
            List<Map.Entry<String, byte[]>> files = new ArrayList<>();
            List<Map.Entry<Integer, Map<String, Object>>> allEntries =
                    new ArrayList<>(rowsMap.entrySet());

            for (int i = 0; i < fileCount; i++) {
                int fromIndex = i * MAX_ROWS_PER_FILE;
                int toIndex = Math.min(fromIndex + MAX_ROWS_PER_FILE, totalRows);

                // ✅ Oracle original row number saqlanadi
                Map<Integer, Map<String, Object>> partMap = new LinkedHashMap<>();
                List<Map.Entry<Integer, Map<String, Object>>> partEntries =
                        allEntries.subList(fromIndex, toIndex);

                for (Map.Entry<Integer, Map<String, Object>> e : partEntries) {
                    partMap.put(e.getKey(), e.getValue());
                }

                byte[] excelBytes = generateExcel(templatePath, partMap);
                files.add(Map.entry(baseName + "_" + (i + 1) + ".xlsx", excelBytes));
                System.out.println("=== Part " + (i + 1) + " yaratildi: "
                        + partMap.size() + " qator"
                        + " (row " + partEntries.get(0).getKey()
                        + " → " + partEntries.get(partEntries.size() - 1).getKey() + ")");
            }

            // 5. Zip
            return wrapInZip(files);

        } catch (Exception e) {
            throw new RuntimeException("Xato: " + e.getMessage(), e);
        }
    }

    // ── Generate Excel ────────────────────────────────────
    private byte[] generateExcel(String templatePath,
                                 Map<Integer, Map<String, Object>> rowsMap) throws Exception {
        try (InputStream fis = new ClassPathResource("templates/" + templatePath).getInputStream()) {
            Workbook workbook = new XSSFWorkbook(fis);
            Sheet sheet = workbook.getSheetAt(0);

            int templateRowIndex = findDataStartRow(sheet);
            Row templateRow = sheet.getRow(templateRowIndex);


            int baseOffset = rowsMap.keySet().iterator().next() - 1;

            for (Map.Entry<Integer, Map<String, Object>> entry : rowsMap.entrySet()) {
                int excelRowIndex = templateRowIndex + (entry.getKey() - baseOffset);
                Map<String, Object> jsonData = entry.getValue();

                Row dataRow = sheet.createRow(excelRowIndex);
                writeRowData(dataRow, jsonData, templateRow);
            }

            sheet.removeRow(templateRow);

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);
            return bos.toByteArray();
        }
    }

    // ── Find template row ─────────────────────────────────
    private int findDataStartRow(Sheet sheet) {
        for (Row row : sheet) {
            for (Cell cell : row) {
                if (cell.getCellType() == CellType.STRING) {
                    String val = cell.getStringCellValue();
                    if (val.startsWith("{") && val.endsWith("}")) {
                        return row.getRowNum();
                    }
                }
            }
        }
        return 1;
    }

    // ── Write row data ────────────────────────────────────
    private void writeRowData(Row targetRow,
                              Map<String, Object> jsonData,
                              Row templateRow) {
        if (templateRow == null) return;
        for (Cell templateCell : templateRow) {
            if (templateCell.getCellType() != CellType.STRING) continue;
            String placeholder = templateCell.getStringCellValue();
            if (!placeholder.startsWith("{") || !placeholder.endsWith("}")) continue;

            String key = placeholder.substring(1, placeholder.length() - 1);
            Object value = jsonData.get(key);

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
}
