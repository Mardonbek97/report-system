package com.example.report_system.service;

import com.example.report_system.dto.ExecuteReportRequestDto;
import com.example.report_system.dto.ReportParamsDto;
import com.example.report_system.entity.Users;
import com.example.report_system.repository.ReportRepository;
import com.example.report_system.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.StringReader;
import java.nio.ByteBuffer;
import java.sql.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportExecService {

    private final ReportRepository reportRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ExcelExportService excelExportService;
    private final DataSource dataSource; //
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final UserRepository userRepository;

    public ReportExecService(ReportRepository reportRepository, JdbcTemplate jdbcTemplate, ExcelExportService excelExportService, DataSource dataSource, UserRepository userRepository) {
        this.reportRepository = reportRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.excelExportService = excelExportService;
        this.dataSource = dataSource;
        this.userRepository = userRepository;
    }

    public List<ReportParamsDto> getParams(UUID repId) {
        List<ReportParamsDto> dto = reportRepository.findByIdParams(repId)
                .stream()
                .map(reportParamsDto -> new ReportParamsDto(reportParamsDto.paramName(),
                                                            reportParamsDto.paramType(),
                                                            reportParamsDto.paramView()))
                .collect(Collectors.toUnmodifiableList());

        return dto;
    }

    public byte[] executeAndExport(ExecuteReportRequestDto request, String templatePath) throws Exception {

        Optional<Users> user = userRepository.findByUsername(request.username());

        // Bitta connection ichida procedure + select
        try (Connection conn = dataSource.getConnection()) {
            Map<Integer, Map<String, Object>> rowsMap = new HashMap<>();

            // 1. Procedure run - shu connection da temp table ga yozadi
            String sql = "BEGIN REP_CORE_UTIL.EXECUTE_PROC(HEXTORAW(?), ?, ?, ?); END;";
            try (CallableStatement stmt = conn.prepareCall(sql)) {

                String hexUuid = request.repId().toString().replace("-", "").toUpperCase();
                stmt.setString(1, hexUuid);
                stmt.setLong(2, user.get().getId());

                // Param definitionlarni olib JSON quramiz
                List<ReportParamsDto> paramDefs = reportRepository
                        .findByIdParams(request.repId())
                        .stream()
                        .map(p -> new ReportParamsDto(p.paramName(), p.paramType(), p.paramView()))
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

            // 2. Shu connection da temp tabladan o'qiymiz
            List<Map<String, Object>> jsonRows = new ArrayList<>();
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT ROW_NUMBER, DATA FROM REP_CORE_TMP ORDER BY 1");
                 ResultSet rs = ps.executeQuery()) {

                while (rs.next()) {
                    int rowNumber = rs.getInt("ROW_NUMBER");
                    String jsonStr = rs.getString("DATA");
                    //System.out.println(jsonStr);
                    Map<String, Object> jsonData = objectMapper.readValue(
                            jsonStr, new TypeReference<Map<String, Object>>() {
                            }
                    );
                    rowsMap.put(rowNumber, jsonData);
                }
            }

            // 3. Excel generate qilamiz
            return generateExcel(templatePath, rowsMap);

        } catch (Exception e) {
            throw new RuntimeException("Xato: " + e.getMessage(), e);
        }
    }

    private byte[] generateExcel(String templatePath, Map<Integer, Map<String, Object>> rowsMap) throws Exception {

        try (FileInputStream fis = new FileInputStream(templatePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            Sheet sheet = workbook.getSheetAt(0);
            int templateRowIndex = findDataStartRow(sheet);
            Row templateRow = sheet.getRow(templateRowIndex);

            // Har bir ROW_NUMBER ga yozamiz
            for (Map.Entry<Integer, Map<String, Object>> entry : rowsMap.entrySet()) {
                int excelRowIndex = entry.getKey();  // ← Oracle dan kelgan ROW_NUMBER
                Map<String, Object> jsonData = entry.getValue();

                Row dataRow = sheet.createRow(excelRowIndex);  // ← aniq o'sha qatorga
                writeRowData(dataRow, jsonData, templateRow);
            }

            // Template o'chirish
            sheet.removeRow(templateRow);

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);
            return bos.toByteArray();
        }
    }

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

    private void writeRowData(Row targetRow, Map<String, Object> jsonData, Row templateRow) {
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

    private Row getOrCreateRow(Sheet sheet, int rowIndex) {
        Row row = sheet.getRow(rowIndex);
        return row != null ? row : sheet.createRow(rowIndex);
    }

    /**
     * Param definitionlar va frontend qiymatlardan JSON quradi
     * { "p_date_from": "2024-01-01", "p_date_to": "2024-12-31" }
     */
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

    /**
     * Tipiga qarab JSON value formatini belgilaydi
     */
    private String convertValue(String type, String value) {
        if (value == null || value.isBlank()) {
            return "null";
        }

        return switch (type.toLowerCase()) {
            // String va Date - qo'shtirnoq bilan
            case "date", "varchar2", "varchar", "string" -> "\"" + value + "\"";
            // Number - qo'shtirnoqsiz
            case "number", "integer", "int" -> value;
            default -> "\"" + value + "\"";
        };
    }

    /**
     * UUID ni Oracle RAW tipiga convert qiladi
     */
    private byte[] uuidToBytes(UUID uuid) {
        ByteBuffer bb = ByteBuffer.wrap(new byte[16]);
        bb.putLong(uuid.getMostSignificantBits());
        bb.putLong(uuid.getLeastSignificantBits());
        return bb.array();
    }

}
