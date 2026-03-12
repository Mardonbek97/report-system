package com.example.report_system.controller;

import com.example.report_system.dto.ScheduleDto;
import com.example.report_system.entity.Users;
import com.example.report_system.repository.ScheduleRepository;
import com.example.report_system.repository.UserRepository;
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
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/schedules")
public class ScheduleController {

    private final ScheduleRepository repo;
    private final UserRepository userRepository;
    @Value("${report.scheduled-reports.dir}")
    private String scheduledReportsDir;

    public ScheduleController(ScheduleRepository repo,
                              UserRepository userRepository) {
        this.repo = repo;
        this.userRepository = userRepository;
    }

    // ── GET /api/schedules ───────────────────────────────────
    @GetMapping
    public ResponseEntity<List<ScheduleDto>> getAll() {
        Authentication auth = getAuth();
        boolean isAdmin = isAdmin(auth);
        Long userId = getUserId(auth.getName());
        return ResponseEntity.ok(repo.findByUser(userId, isAdmin));
    }

    // ── POST /api/schedules ──────────────────────────────────
    @PostMapping
    public ResponseEntity<?> create(@RequestBody ScheduleDto dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Users user = (Users) auth.getPrincipal();
        try {
            Long userId = getUserId(user.getUsername());
            repo.save(dto, userId);
            return ResponseEntity.ok(Map.of("message", "Schedule yaratildi"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ── PATCH /api/schedules/{id}/toggle ────────────────────
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<?> toggle(@PathVariable String id,
                                    @RequestBody Map<String, Boolean> body) {
        Boolean active = body.get("active");
        if (active == null) return ResponseEntity.badRequest()
                .body(Map.of("error", "'active' field kerak"));
        repo.toggleActive(id, active);
        return ResponseEntity.ok(Map.of("message", "Yangilandi"));
    }

    // ── DELETE /api/schedules/{id} ───────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        repo.delete(id);
        return ResponseEntity.ok(Map.of("message", "O'chirildi"));
    }

    // ── GET /api/schedules/download?filePath=... ─────────────────
    @GetMapping("/download")
    public ResponseEntity<Resource> downloadFile(@RequestParam String filePath) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAdmin = isAdmin(auth);
            Users currentUser = (Users) auth.getPrincipal();

            // Security: user faqat o'z faylini yuklab olishi mumkin
            // filePath: "scheduled-reports/username/file.xlsx"
            if (!isAdmin) {
                String expectedPrefix = "scheduled-reports/" + currentUser.getUsername() + "/";
                String normalizedPath = filePath.replace("\\", "/");
                if (!normalizedPath.contains("/" + currentUser.getUsername() + "/")) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }

            // scheduledReportsDir + fayl nomi
            Path baseDir = Paths.get(scheduledReportsDir).toAbsolutePath().normalize();
            // filePath ichidan faqat fayl nomini olamiz (xavfsizlik uchun)
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

            // Content type aniqlash
            String ext = fileName.contains(".")
                    ? fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase()
                    : "bin";
            MediaType mediaType = switch (ext) {
                case "xlsx" ->
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                case "docx" ->
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
                case "txt" -> MediaType.TEXT_PLAIN;
                case "zip" -> MediaType.parseMediaType("application/zip");
                default -> MediaType.APPLICATION_OCTET_STREAM;
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

    // ── Helpers ──────────────────────────────────────────────
    private Authentication getAuth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private Long getUserId(String username) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Users user = (Users) auth.getPrincipal();
        return user.getId();
    }
}