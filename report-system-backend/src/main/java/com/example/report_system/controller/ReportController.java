package com.example.report_system.controller;

import com.example.report_system.dto.ExecuteReportRequestDto;
import com.example.report_system.dto.ReportExecLogDto;
import com.example.report_system.dto.ReportParamsExecDto;
import com.example.report_system.entity.Users;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.service.ExcelExportService;
import com.example.report_system.service.ReportExecService;
import com.example.report_system.service.ReportExecZipService;
import com.example.report_system.service.ReportService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
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
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            Users user = (Users) auth.getPrincipal();
            String username = user.getUsername();
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            Map<String, Object> result = reportService.getAllReport(page, size, search, isAdmin, username);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            String msg = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            return ResponseEntity.status(500).body(Map.of("error", msg != null ? msg : e.toString()));
        }
    }


    @GetMapping("/report")
    public List<ReportParamsExecDto> getParam(@RequestParam UUID repId, @RequestHeader(value = "Accept-Language") ApplanguageEnum lang) {
        return reportExecService.getParams(repId);
    }


    @PostMapping("/generate")
    public ResponseEntity<String> generateReport(@RequestBody ExecuteReportRequestDto request) throws Exception {

        ReportExecZipService.ExportResult result = reportExecZipService.executeAndExportZip(request);

        String ext = result.extension();
        String fileName = "report_" + System.currentTimeMillis() + "." + ext;
        String filePath = allowedExportDir + fileName;

        Files.write(Paths.get(filePath), result.bytes());

        return ResponseEntity.ok("Fayl saqlandi: " + filePath);
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

        // 2. Ruxsat etilgan formatlar
        String filePathStr = filePath.toString().toLowerCase();
        if (!filePathStr.endsWith(".xlsx")
                && !filePathStr.endsWith(".zip")
                && !filePathStr.endsWith(".docx")
                && !filePathStr.endsWith(".txt")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 3. Fayl mavjudligini tekshirish
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }

        // 4. Content type
        MediaType contentType;
        if (filePathStr.endsWith(".zip")) contentType = MediaType.parseMediaType("application/zip");
        else if (filePathStr.endsWith(".docx"))
            contentType = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        else if (filePathStr.endsWith(".txt")) contentType = MediaType.TEXT_PLAIN;
        else
            contentType = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filePath.getFileName().toString() + "\"")
                .contentType(contentType)
                .body(resource);
    }

    @GetMapping("/report/logs")
    public ResponseEntity<Map<String, Object>> getReportLogs(
            @RequestParam String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        Page<ReportExecLogDto> pageResult = reportService.fetchTempData(username, isAdmin, page, size);

        Map<String, Object> response = Map.of(
                "content", pageResult.getContent(),
                "totalPages", pageResult.getTotalPages(),
                "totalElements", pageResult.getTotalElements(),
                "number", pageResult.getNumber(),
                "size", pageResult.getSize()
        );

        return ResponseEntity.ok(response);
    }


}
