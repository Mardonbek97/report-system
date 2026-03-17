package com.example.report_system.service;

import com.example.report_system.dto.ExecuteReportRequestDto;
import com.example.report_system.dto.ScheduleDto;
import com.example.report_system.repository.ScheduleRepositoryJdbc;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SchedulerService {

    private final ScheduleRepositoryJdbc scheduleRepositoryJdbc;
    private final ReportExecZipService   execService;
    private final ObjectMapper           objectMapper;

    @Value("${report.scheduled-reports.dir}")
    private String scheduledReportsDir;

    public SchedulerService(ScheduleRepositoryJdbc scheduleRepositoryJdbc,
                            ReportExecZipService execService,
                            ObjectMapper objectMapper) {
        this.scheduleRepositoryJdbc = scheduleRepositoryJdbc;
        this.execService            = execService;
        this.objectMapper           = objectMapper;
    }

    // ── Har daqiqa tekshiradi ────────────────────────────────────────────────
    @Scheduled(fixedDelay = 60_000)
    public void runSchedules() {
        // 1. One-time — vaqti kelganlar
        for (ScheduleDto s : scheduleRepositoryJdbc.findDueOnetime()) {
            execute(s);
            scheduleRepositoryJdbc.toggleActive(s.getId(), false);
        }

        // 2. Cron — hozir ishlashi kerakmi tekshir
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        for (ScheduleDto s : scheduleRepositoryJdbc.findActiveCron()) {
            if (shouldRunNow(s.getCronExpr(), now)) {
                execute(s);
            }
        }
    }

    // ── Pagination bilan ro'yxat ─────────────────────────────────────────────
    public Map<String, Object> findByUser(Long userId, boolean isAdmin,
                                          int page, int size, String search) {
        int offset    = page * size;
        int rownumMax = offset + size;
        boolean hasSearch = search != null && !search.trim().isEmpty();
        String like = "%" + (hasSearch ? search.trim().toLowerCase() : "") + "%";

        int total = scheduleRepositoryJdbc.countAll(userId, isAdmin, like, hasSearch);
        List<ScheduleDto> content = scheduleRepositoryJdbc.findAllPaged(
                userId, isAdmin, offset, rownumMax, like, hasSearch);
        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 1;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content",       content);
        result.put("totalElements", total);
        result.put("totalPages",    Math.max(1, totalPages));
        result.put("number",        page);
        result.put("size",          size);
        return result;
    }

    // ── Soft delete: is_deleted = 1, is_active = 0 ──────────────────────────
    public void softDelete(String scheduleId) {
        scheduleRepositoryJdbc.softDelete(scheduleId);
    }

    // ── Toggle: is_active ni o'zgartirish ───────────────────────────────────
    public void toggle(String scheduleId, boolean active) {
        scheduleRepositoryJdbc.toggleActive(scheduleId, active);
    }

    // ── Schedule ni bajarish ─────────────────────────────────────────────────
    private void execute(ScheduleDto s) {
        try {
            Map<String, String> paramsMap = objectMapper.readValue(
                    s.getParams() != null ? s.getParams() : "{}",
                    new TypeReference<Map<String, String>>() {}
            );

            ExecuteReportRequestDto request = new ExecuteReportRequestDto(
                    s.getUsername(),
                    UUID.fromString(s.getRepId()),
                    paramsMap,
                    s.getFileFormat() != null ? s.getFileFormat() : "xlsx"
            );

            ReportExecZipService.ExportResult result = execService.executeAndExportZip(request);

            Path dir = Paths.get(scheduledReportsDir, s.getUsername());
            Files.createDirectories(dir);

            String timestamp = LocalDateTime.now()
                    .toString().replace(":", "-").replace(".", "-");
            String fileName  = s.getRepId() + "_" + timestamp + "." + result.extension();
            Path filePath    = dir.resolve(fileName);
            Files.write(filePath, result.bytes());

            scheduleRepositoryJdbc.updateResult(s.getId(), "SUCCESS", null, filePath.toString());

        } catch (Exception e) {
            String errMsg = e.getMessage() != null
                    ? e.getMessage().substring(0, Math.min(e.getMessage().length(), 900))
                    : "Unknown error";
            scheduleRepositoryJdbc.updateResult(s.getId(), "ERROR", errMsg, null);
        }
    }

    // ── Cron expression hozir ishlaydimi ────────────────────────────────────
    private boolean shouldRunNow(String cronExpr, LocalDateTime now) {
        try {
            String springCron = toSpringCron(cronExpr);
            CronExpression expr = CronExpression.parse(springCron);
            LocalDateTime next = expr.next(now.minusMinutes(1));
            return next != null && !next.isAfter(now);
        } catch (Exception e) {
            return false;
        }
    }

    // "0 8 * * MON-FRI" → "0 0 8 * * MON-FRI"
    private String toSpringCron(String cron) {
        if (cron == null) return cron;
        String[] parts = cron.trim().split("\\s+");
        return parts.length == 5 ? "0 " + cron : cron;
    }
}