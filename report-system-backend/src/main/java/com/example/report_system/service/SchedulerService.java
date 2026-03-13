package com.example.report_system.service;

import com.example.report_system.dto.ExecuteReportRequestDto;
import com.example.report_system.dto.ScheduleDto;
import com.example.report_system.repository.ScheduleRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SchedulerService {

    private final ScheduleRepository      repo;
    private final ReportExecZipService    execService;
    private final ObjectMapper            objectMapper;
    private final JdbcTemplate            jdbc;

    public SchedulerService(ScheduleRepository repo,
                            ReportExecZipService execService,
                            ObjectMapper objectMapper, JdbcTemplate jdbc) {
        this.repo        = repo;
        this.execService = execService;
        this.objectMapper = objectMapper;
        this.jdbc = jdbc;
    }

    // ── Har daqiqa tekshiradi ────────────────────────────────
    @Scheduled(fixedDelay = 60_000)
    public void runSchedules() {
        // 1. One-time — vaqti kelganlar
        for (ScheduleDto s : findDueOnetime()) {
            execute(s);
            repo.toggleActive(s.getId(), false); // bir marta ishlagach o'chir
        }

        // 2. Cron — hozir ishlashi kerakmi tekshir
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        for (ScheduleDto s : findActiveCron()) {
            if (shouldRunNow(s.getCronExpr(), now)) {
                execute(s);
            }
        }
    }


    // ScheduleRepository.java — findByUser() ni shu bilan almashtiring:
    public Map<String, Object> findByUser(Long userId, boolean isAdmin, int page, int size, String search) {
        int offset    = page * size;
        int rownumMax = offset + size;
        boolean hasSearch = search != null && !search.trim().isEmpty();
        String like = "%" + (hasSearch ? search.trim().toLowerCase() : "") + "%";

        String userWhere  = isAdmin ? "" : "AND s.user_id = ? ";
        String searchWhere = hasSearch ? "AND (LOWER(n.name) LIKE ? OR LOWER(u.username) LIKE ?) " : "";

        // ── Count ──────────────────────────────────────────────────
        String countSql =
                "SELECT COUNT(*) FROM rep_core_schedule s " +
                        "JOIN rep_core_name n  ON n.id = s.rep_id " +
                        "JOIN rep_core_users u ON u.id = s.user_id " +
                        "WHERE 1=1 " + userWhere + searchWhere;

        Integer total;
        if (!isAdmin && hasSearch)
            total = jdbc.queryForObject(countSql, Integer.class, userId, like, like);
        else if (!isAdmin)
            total = jdbc.queryForObject(countSql, Integer.class, userId);
        else if (hasSearch)
            total = jdbc.queryForObject(countSql, Integer.class, like, like);
        else
            total = jdbc.queryForObject(countSql, Integer.class);
        if (total == null) total = 0;

        // ── Oracle 11g ROWNUM ──────────────────────────────────────
        String innerSql =
                "SELECT s.id, s.rep_id, n.name AS rep_name, " +
                        "       s.user_id, u.username, s.params, s.file_format, " +
                        "       s.cron_expr, s.run_at, s.is_active, " +
                        "       s.last_run, s.last_status, s.last_error, s.last_file " +
                        "FROM rep_core_schedule s " +
                        "JOIN rep_core_name n  ON n.id = s.rep_id " +
                        "JOIN rep_core_users u ON u.id = s.user_id " +
                        "WHERE 1=1 " + userWhere + searchWhere +
                        "ORDER BY s.created_at DESC";

        String sql =
                "SELECT * FROM (" +
                        "  SELECT t.*, ROWNUM rn FROM (" + innerSql + ") t" +
                        "  WHERE ROWNUM <= ?" +
                        ") WHERE rn > ?";

        // Build params list
        java.util.List<Object> params = new java.util.ArrayList<>();
        if (!isAdmin)  params.add(userId);
        if (hasSearch) { params.add(like); params.add(like); }
        params.add(rownumMax);
        params.add(offset);

        java.util.List<ScheduleDto> content = jdbc.query(
                sql, params.toArray(), (rs, i) -> mapFull(rs)
        );

        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 1;

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("content",       content);
        result.put("totalElements", total);
        result.put("totalPages",    Math.max(1, totalPages));
        result.put("number",        page);
        result.put("size",          size);
        return result;
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

    // ── Mappers ───────────────────────────────────────────────
    private ScheduleDto mapFull(ResultSet rs) throws SQLException {
        ScheduleDto d = mapMinimal(rs);
        d.setRepName(rs.getString("rep_name"));
        d.setActive(rs.getInt("is_active") == 1);
        Timestamp lastRun = rs.getTimestamp("last_run");
        if (lastRun != null) d.setLastRun(lastRun.toLocalDateTime().toString());
        d.setLastStatus(rs.getString("last_status"));
        d.setLastError(rs.getString("last_error"));
        d.setLastFile(rs.getString("last_file"));
        return d;
    }

    // ── One-time: vaqti kelgan, hali ishlamagan ───────────────
    public List<ScheduleDto> findDueOnetime() {
        String sql = "SELECT s.id, s.rep_id, s.user_id, u.username, " +
                "       s.params, s.file_format, s.cron_expr, s.run_at " +
                "FROM rep_core_schedule s " +
                "JOIN rep_core_users u ON u.id = s.user_id " +
                "WHERE s.is_active = 1 " +
                "  AND s.cron_expr IS NULL " +
                "  AND s.run_at <= SYSTIMESTAMP " +
                "  AND (s.last_run IS NULL OR s.last_run < s.run_at)";
        return jdbc.query(sql, (rs, i) -> mapMinimal(rs));
    }

    // ── Cron: barcha active ───────────────────────────────────
    public List<ScheduleDto> findActiveCron() {
        String sql = "SELECT s.id, s.rep_id, s.user_id, u.username, " +
                "       s.params, s.file_format, s.cron_expr, s.run_at " +
                "FROM rep_core_schedule s " +
                "JOIN rep_core_users u ON u.id = s.user_id " +
                "WHERE s.is_active = 1 AND s.cron_expr IS NOT NULL";
        return jdbc.query(sql, (rs, i) -> mapMinimal(rs));
    }


    private ScheduleDto mapMinimal(ResultSet rs) throws SQLException {
        ScheduleDto d = new ScheduleDto();
        d.setId(bytesToUuid(rs.getBytes("id")));
        d.setRepId(bytesToUuid(rs.getBytes("rep_id")));
        d.setUserId(rs.getLong("user_id"));
        d.setUsername(rs.getString("username"));
        d.setParams(rs.getString("params"));
        d.setFileFormat(rs.getString("file_format"));
        d.setCronExpr(rs.getString("cron_expr"));
        Timestamp runAt = rs.getTimestamp("run_at");
        if (runAt != null) d.setRunAt(runAt.toLocalDateTime().toString());
        return d;
    }

    // ── byte[] → UUID string ──────────────────────────────────
    private String bytesToUuid(byte[] bytes) {
        if (bytes == null) return null;
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        String h = sb.toString();
        return h.substring(0,8) + "-" + h.substring(8,12) + "-"
                + h.substring(12,16) + "-" + h.substring(16,20) + "-" + h.substring(20);
    }
}