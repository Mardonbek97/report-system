package com.example.report_system.controller;

import com.example.report_system.dto.ScheduleDto;
import com.example.report_system.entity.Users;
import com.example.report_system.repository.ScheduleRepositoryJdbc;
import com.example.report_system.service.SchedulerService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

/**
 * Faqat HTTP layer.
 * Biznes logika → SchedulerService
 * CRUD operatsiyalar → ScheduleRepositoryCustom (to'g'ridan, chunki bu
 *   oddiy CRUD — service orqali o'tkazish ortiqcha abstraction bo'lardi)
 *
 * Qoida: agar service faqat repo ni chaqirib qaytarsa,
 *        controller to'g'ridan repositoryni chaqirishi mumkin (CRUD uchun).
 */
@RestController
@RequestMapping("/schedules")
public class ScheduleController {

    private final SchedulerService         schedulerService;
    private final ScheduleRepositoryJdbc scheduleRepo;

    @Value("${report.scheduled-reports.dir}")
    private String scheduledReportsDir;

    public ScheduleController(SchedulerService schedulerService,
                              ScheduleRepositoryJdbc scheduleRepo) {
        this.schedulerService = schedulerService;
        this.scheduleRepo     = scheduleRepo;
    }

    // ── GET /schedules ───────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "")   String search) {
        try {
            Authentication auth = getAuth();
            boolean isAdmin = isAdmin(auth);
            Long userId = getCurrentUser(auth).getId();
            Map<String, Object> result = schedulerService.findByUser(userId, isAdmin, page, size, search);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── POST /schedules ──────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> create(@RequestBody ScheduleDto dto) {
        try {
            Users user = getCurrentUser(getAuth());
            scheduleRepo.save(dto, user.getId());
            return ResponseEntity.ok(Map.of("message", "Schedule yaratildi"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── PATCH /schedules/{id}/toggle ─────────────────────────────────────────
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<?> toggle(@PathVariable String id,
                                    @RequestBody Map<String, Boolean> body) {
        Boolean active = body.get("active");
        if (active == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "'active' field kerak"));
        }
        scheduleRepo.toggleActive(id, active);
        return ResponseEntity.ok(Map.of("message", "Yangilandi"));
    }

    // ── DELETE /schedules/{id} ───────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        scheduleRepo.delete(id);
        return ResponseEntity.ok(Map.of("message", "O'chirildi"));
    }

    // ── GET /schedules/download?filePath=... ─────────────────────────────────
    @GetMapping("/download")
    public ResponseEntity<Resource> downloadFile(@RequestParam String filePath) {
        try {
            Authentication auth = getAuth();
            boolean isAdmin = isAdmin(auth);
            Users currentUser = getCurrentUser(auth);

            // Security: user faqat o'z faylini yuklab olishi mumkin
            if (!isAdmin) {
                String normalizedPath = filePath.replace("\\", "/");
                if (!normalizedPath.contains("/" + currentUser.getUsername() + "/")) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }

            Path baseDir = Paths.get(scheduledReportsDir).toAbsolutePath().normalize();
            String fileName = Paths.get(filePath).getFileName().toString();
            String username = isAdmin
                    ? Paths.get(filePath.replace("\\", "/")).getParent().getFileName().toString()
                    : currentUser.getUsername();

            Path fullPath = baseDir.resolve(username).resolve(fileName).normalize();

            // Path traversal himoya
            if (!fullPath.startsWith(baseDir)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Resource resource = new UrlResource(fullPath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            String ext = fileName.contains(".")
                    ? fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase()
                    : "bin";

            MediaType mediaType = switch (ext) {
                case "xlsx" -> MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                case "docx" -> MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
                case "txt"  -> MediaType.TEXT_PLAIN;
                case "zip"  -> MediaType.parseMediaType("application/zip");
                default     -> MediaType.APPLICATION_OCTET_STREAM;
            };

            String encodedName = URLEncoder.encode(fileName, StandardCharsets.UTF_8)
                    .replace("+", "%20");

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedName)
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
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
