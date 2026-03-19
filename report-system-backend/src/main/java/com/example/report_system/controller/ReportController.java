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

    private final ReportService        reportService;
    private final ReportExecService    reportExecService;
    private final ReportExecZipService reportExecZipService;
    private final ExcelExportService   excelExportService;

    @Value("${report.download.dir}")
    private String allowedDownloadDir;

    @Value("${report.export.dir}")
    private String allowedExportDir;

    public ReportController(ReportService reportService,
                            ReportExecService reportExecService,
                            ReportExecZipService reportExecZipService,
                            ExcelExportService excelExportService) {
        this.reportService        = reportService;
        this.reportExecService    = reportExecService;
        this.reportExecZipService = reportExecZipService;
        this.excelExportService   = excelExportService;
    }

    // ── GET /reports/folders ─────────────────────────────────────────────────
    @GetMapping("/folders")
    public ResponseEntity<?> getFolders() {
        try {
            Authentication auth = getAuth();
            List<Map<String, Object>> folders = reportService.getFolders(isAdmin(auth), getCurrentUser(auth).getId());
            return ResponseEntity.ok(folders);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── GET /reports?page=&size=&search=&folderId= ───────────────────────────
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "")   String search,
            @RequestParam(required = false)    String folderId) {
        try {
            Authentication auth = getAuth();
            Map<String, Object> result = reportService.getAllReport(
                    page, size, search, isAdmin(auth), getCurrentUser(auth).getId(), folderId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── GET /reports/report?repId= ───────────────────────────────────────────
    @GetMapping("/report")
    public List<ReportParamsExecDto> getParam(
            @RequestParam UUID repId,
            @RequestHeader(value = "Accept-Language") ApplanguageEnum lang) {
        return reportExecService.getParams(repId);
    }

    // ── POST /reports/generate ───────────────────────────────────────────────
    @PostMapping("/generate")
    public ResponseEntity<String> generateReport(@RequestBody ExecuteReportRequestDto request) throws Exception {
        ReportExecZipService.ExportResult result = reportExecZipService.executeAndExportZip(request);
        String fileName = "report_" + System.currentTimeMillis() + "." + result.extension();
        String filePath = allowedExportDir + fileName;
        Files.write(Paths.get(filePath), result.bytes());
        return ResponseEntity.ok("Fayl saqlandi: " + filePath);
    }

    // ── GET /reports/download?path= ──────────────────────────────────────────
    @GetMapping("/download")
    public ResponseEntity<Resource> downloadFile(@RequestParam String path,
                                                 @AuthenticationPrincipal Users currentUser) throws IOException {
        Path filePath   = Paths.get(path).normalize().toAbsolutePath();
        Path allowedDir = Paths.get(allowedDownloadDir).toAbsolutePath();

        if (!filePath.startsWith(allowedDir)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String fp = filePath.toString().toLowerCase();
        if (!fp.endsWith(".xlsx") && !fp.endsWith(".zip")
                && !fp.endsWith(".docx") && !fp.endsWith(".txt")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }

        MediaType contentType;
        if      (fp.endsWith(".zip"))  contentType = MediaType.parseMediaType("application/zip");
        else if (fp.endsWith(".docx")) contentType = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        else if (fp.endsWith(".txt"))  contentType = MediaType.TEXT_PLAIN;
        else                           contentType = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filePath.getFileName() + "\"")
                .contentType(contentType)
                .body(resource);
    }

    // ── GET /reports/report/logs ─────────────────────────────────────────────
    @GetMapping("/report/logs")
    public ResponseEntity<Map<String, Object>> getReportLogs(
            @RequestParam String username,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "15") int size) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        Page<ReportExecLogDto> pageResult = reportService.fetchTempData(username, isAdmin, page, size);

        return ResponseEntity.ok(Map.of(
                "content",       pageResult.getContent(),
                "totalPages",    pageResult.getTotalPages(),
                "totalElements", pageResult.getTotalElements(),
                "number",        pageResult.getNumber(),
                "size",          pageResult.getSize()
        ));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    private Authentication getAuth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private Users getCurrentUser(Authentication auth) {
        return (Users) auth.getPrincipal();
    }
}