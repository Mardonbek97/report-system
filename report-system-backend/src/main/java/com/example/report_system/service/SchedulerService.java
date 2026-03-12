package com.example.report_system.service;

import com.example.report_system.dto.ExecuteReportRequestDto;
import com.example.report_system.dto.ScheduleDto;
import com.example.report_system.repository.ScheduleRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SchedulerService {

    private final ScheduleRepository      repo;
    private final ReportExecZipService    execService;
    private final ObjectMapper            objectMapper;

    public SchedulerService(ScheduleRepository repo,
                            ReportExecZipService execService,
                            ObjectMapper objectMapper) {
        this.repo        = repo;
        this.execService = execService;
        this.objectMapper = objectMapper;
    }

    // ── Har daqiqa tekshiradi ────────────────────────────────
    @Scheduled(fixedDelay = 60_000)
    public void runSchedules() {
        // 1. One-time — vaqti kelganlar
        for (ScheduleDto s : repo.findDueOnetime()) {
            execute(s);
            repo.toggleActive(s.getId(), false); // bir marta ishlagach o'chir
        }

        // 2. Cron — hozir ishlashi kerakmi tekshir
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        for (ScheduleDto s : repo.findActiveCron()) {
            if (shouldRunNow(s.getCronExpr(), now)) {
                execute(s);
            }
        }
    }

    // ── Cron expression hozir ishlaydimi ────────────────────
    private boolean shouldRunNow(String cronExpr, LocalDateTime now) {
        try {
            // Spring cron: "s m h dom mon dow" — 6 field
            // Oddiy 5-field cron ni 6-field ga o'giramiz
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
        if (parts.length == 5) return "0 " + cron; // seconds qo'shamiz
        return cron; // allaqachon 6-field
    }

    // ── Schedule ni bajarish ─────────────────────────────────
    private void execute(ScheduleDto s) {
        try {
            // params JSON → Map<String, String>
            Map<String, String> paramsMap = objectMapper.readValue(
                    s.getParams() != null ? s.getParams() : "{}",
                    new TypeReference<Map<String, String>>() {}
            );

            // ExecuteReportRequestDto orqali mavjud servisni chaqiramiz
            ExecuteReportRequestDto request = new ExecuteReportRequestDto(
                    s.getUsername(),
                    UUID.fromString(s.getRepId()),
                    paramsMap,
                    s.getFileFormat() != null ? s.getFileFormat() : "xlsx"
            );

            ReportExecZipService.ExportResult result = execService.executeAndExportZip(request);

            // Faylni serverga saqlaymiz
            String dir = "scheduled-reports/" + s.getUsername();
            Files.createDirectories(Paths.get(dir));

            String timestamp = LocalDateTime.now()
                    .toString().replace(":", "-").replace(".", "-");
            String fileName = s.getRepId() + "_" + timestamp + "." + result.extension();
            Path filePath = Paths.get(dir, fileName);
            Files.write(filePath, result.bytes());

            repo.updateResult(s.getId(), "SUCCESS", null, filePath.toString());

        } catch (Exception e) {
            repo.updateResult(s.getId(), "ERROR",
                    e.getMessage() != null
                            ? e.getMessage().substring(0, Math.min(e.getMessage().length(), 900))
                            : "Unknown error",
                    null);
        }
    }
}