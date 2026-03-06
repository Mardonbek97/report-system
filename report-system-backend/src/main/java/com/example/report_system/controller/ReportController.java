package com.example.report_system.controller;

import com.example.report_system.dto.*;
import com.example.report_system.entity.Users;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.service.ExcelExportService;
import com.example.report_system.service.ReportExecService;
import com.example.report_system.service.ReportExecZipService;
import com.example.report_system.service.ReportService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    private final ReportExecZipService reportExecZipService;
    private final ExcelExportService excelExportService;
    @Value("${report.download.dir}")
    private String allowedDownloadDir;
    @Value("${report.export.dir}")
    private String allowedExportDir;

    public ReportController(ReportService reportService, ReportExecService reportExecService, ReportExecZipService reportExecZipService, ExcelExportService excelExportService) {
        this.reportService = reportService;
        this.reportExecService = reportExecService;
        this.reportExecZipService = reportExecZipService;
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
    public List<ReportParamsExecDto> getParam(@RequestParam UUID repId, @RequestHeader(value = "Accept-Language") ApplanguageEnum lang) {
        return reportExecService.getParams(repId);
    }


    /*@PostMapping("/generate")
        public ResponseEntity<String> generateReport(@RequestBody ExecuteReportRequestDto request) throws Exception {

            // Excel generate
            byte[] excelBytes = reportExecService.executeAndExport(request);

            // Faylga saqlash
            String fileName = "report_" + System.currentTimeMillis() + ".xlsx";
            String filePath = allowedExportDir + fileName;
            Files.write(Paths.get(filePath), excelBytes);

            return ResponseEntity.ok("Fayl saqlandi: " + filePath);
    }*/

    @PostMapping("/generate")
    public ResponseEntity<String> generateReport(@RequestBody ExecuteReportRequestDto request) throws Exception {

        byte[] zipBytes = reportExecZipService.executeAndExportZip(request);

        String fileName = "report_" + System.currentTimeMillis() + ".zip";
        String filePath = allowedExportDir + fileName;
        Files.write(Paths.get(filePath), zipBytes);

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
    public ResponseEntity<Resource> downloadFile(@RequestParam String path,
                                                 @AuthenticationPrincipal Users currentUser) throws IOException {

        // 1. Path traversal himoyasi
        Path filePath = Paths.get(path).normalize().toAbsolutePath();
        Path allowedDir = Paths.get(allowedDownloadDir).toAbsolutePath();

        if (!filePath.startsWith(allowedDir)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 2. Faqat .xlsx va .zip fayllar
        String filePathStr = filePath.toString().toLowerCase();
        if (!filePathStr.endsWith(".xlsx") && !filePathStr.endsWith(".zip")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 3. Fayl mavjudligini tekshirish
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }

        // 4. Content type — xlsx yoki zip
        MediaType contentType = filePathStr.endsWith(".zip")
                ? MediaType.parseMediaType("application/zip")
                : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filePath.getFileName().toString() + "\"")
                .contentType(contentType)
                .body(resource);
    }
}
