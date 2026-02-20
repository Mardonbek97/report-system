package com.example.report_system.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class ExcelExportService {
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ExcelExportService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Temp tabladan ma'lumot olib Excel ga yozadi
     *
     * @param templatePath - shablon fayl yo'li
     * @return - to'ldirilgan Excel fayl bytes
     */
    public byte[] generateExcel(String templatePath) throws Exception {

        // 1. Temp tabladan ma'lumotlarni olamiz
        List<Map<String, Object>> rows = fetchTempData();

        // 2. Excel shablonni yuklaymiz
        try (FileInputStream fis = new FileInputStream(templatePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            Sheet sheet = workbook.getSheetAt(0);

            // 3. Shablon header qatorini topamiz (placeholder bor qator)
            int dataStartRow = findDataStartRow(sheet);

            // 4. Har bir JSON qatorni Excelga yozamiz
            for (int i = 0; i < rows.size(); i++) {
                int excelRowIndex = dataStartRow + i;
                Row row = getOrCreateRow(sheet, excelRowIndex);
                writeRowData(row, rows.get(i), sheet.getRow(dataStartRow));
            }

            // 5. ByteArray sifatida qaytaramiz
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);
            return bos.toByteArray();
        }
    }

    /**
     * Temp tabladan SELECT qilib olamiz
     */
    private List<Map<String, Object>> fetchTempData() throws Exception {
        List<Map<String, Object>> result = new ArrayList<>();

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT ROW_NUMBER, DATA FROM REP_CORE_TMP ORDER BY ROW_NUMBER"
        );

        for (Map<String, Object> row : rows) {
            // DATA ustuni CLOB - JSON string
            String jsonStr = row.get("DATA").toString();

            // JSON parse qilamiz
            Map<String, Object> jsonData = objectMapper.readValue(
                    jsonStr, new TypeReference<Map<String, Object>>() {
                    }
            );

            result.add(jsonData);
        }

        return result;
    }

    /**
     * Shablon ichida {placeholder} bor qatorni topadi
     * Misol: {name}, {amount}, {date}
     */
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
        return 1; // default - 2-qator (0-indexed)
    }

    /**
     * Bitta qatorni yozadi
     * Shablon: {name} | {amount} | {date}
     * JSON:    {"name": "Ali", "amount": 1000, "date": "2024-01-01"}
     */
    private void writeRowData(Row targetRow, Map<String, Object> jsonData, Row templateRow) {
        if (templateRow == null) return;

        for (Cell templateCell : templateRow) {
            if (templateCell.getCellType() != CellType.STRING) continue;

            String placeholder = templateCell.getStringCellValue(); // "{name}"
            if (!placeholder.startsWith("{") || !placeholder.endsWith("}")) continue;

            // {name} → name
            String key = placeholder.substring(1, placeholder.length() - 1);
            Object value = jsonData.get(key);

            Cell newCell = targetRow.createCell(templateCell.getColumnIndex());

            // Shablon cell stilini copy qilamiz
            newCell.setCellStyle(templateCell.getCellStyle());

            // Tipiga qarab yozamiz
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
}
