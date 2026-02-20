package com.example.report_system.controller;

import com.example.report_system.dto.ExecuteReportRequestDto;
import com.example.report_system.dto.LoginRequestDto;
import com.example.report_system.dto.ReportListDto;
import com.example.report_system.dto.ReportParamsDto;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.service.ExcelExportService;
import com.example.report_system.service.ReportExecService;
import com.example.report_system.service.ReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/reports")
public class ReportController {

    private final ReportService reportService;
    private final ReportExecService reportExecService;
    private final ExcelExportService excelExportService;

    public ReportController(ReportService reportService, ReportExecService reportExecService, ExcelExportService excelExportService) {
        this.reportService = reportService;
        this.reportExecService = reportExecService;
        this.excelExportService = excelExportService;
    }

    @GetMapping("")
    public List<ReportListDto> getAll(){
        try{
            return reportService.getAllReport();
        }catch (Exception e){
            throw e;
        }
    }

    @GetMapping("/report")
    public List<ReportParamsDto> getParam(@RequestParam UUID repId, @RequestHeader(value = "Accept-Language") ApplanguageEnum lang){
        return reportExecService.getParams(repId);
    }


    @PostMapping("/generate")
    public ResponseEntity<String> generateReport(@RequestBody ExecuteReportRequestDto request) throws Exception {

        String templatePath = "D:/Spring/Book1.xlsx";

        // Excel generate
        byte[] excelBytes = reportExecService.executeAndExport(request, templatePath);

        // Faylga saqlash
        String fileName = "report_" + System.currentTimeMillis() + ".xlsx";
        String filePath = "C:/Users/sobm/Downloads/" + fileName;
        Files.write(Paths.get(filePath), excelBytes);

        return ResponseEntity.ok("Fayl saqlandi: " + filePath);
    }



}
