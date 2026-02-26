package com.example.report_system.controller;

import com.example.report_system.dto.ExecuteReportRequestDto;
import com.example.report_system.dto.ReportExecLogDto;
import com.example.report_system.dto.ReportListDto;
import com.example.report_system.dto.ReportParamsDto;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.service.ExcelExportService;
import com.example.report_system.service.ReportExecService;
import com.example.report_system.service.ReportService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

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
    public List<ReportListDto> getAll() {
        try {
            return reportService.getAllReport();
        } catch (Exception e) {
            throw e;
        }
    }

    @GetMapping("/report")
    public List<ReportParamsDto> getParam(@RequestParam UUID repId, @RequestHeader(value = "Accept-Language") ApplanguageEnum lang) {
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


    @GetMapping("/report/logs")
    public List<ReportExecLogDto> getReportLogs(
            @RequestParam String username) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
        boolean isAdmin = authorities.stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        return reportService.fetchTempData(username, isAdmin);
    }

    @GetMapping("/download")
    public ResponseEntity<Resource> downloadFile(@RequestParam String path) throws IOException {
        Path filePath = Paths.get(path);
        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filePath.getFileName().toString() + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(resource);
    }

}
