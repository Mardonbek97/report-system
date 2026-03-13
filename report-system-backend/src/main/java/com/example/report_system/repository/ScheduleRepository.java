package com.example.report_system.repository;

import com.example.report_system.dto.ScheduleDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;

@Repository
public class ScheduleRepository {

    private final JdbcTemplate jdbc;

    public ScheduleRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ── Save ─────────────────────────────────────────────────
    public void save(ScheduleDto dto, Long userId) {
        String sql = "INSERT INTO rep_core_schedule " +
                "  (id, rep_id, user_id, params, file_format, cron_expr, run_at, is_active) " +
                "VALUES (SYS_GUID(), HEXTORAW(?), ?, ?, ?, ?, ?, 1)";
        jdbc.update(sql,
                dto.getRepId().replace("-", "").toUpperCase(),
                userId,
                dto.getParams(),
                dto.getFileFormat() != null ? dto.getFileFormat() : "xlsx",
                dto.getCronExpr(),
                dto.getRunAt() != null
                        ? Timestamp.valueOf(LocalDateTime.parse(dto.getRunAt()))
                        : null
        );
    }

    // ── Toggle active ────────────────────────────────────────
    public void toggleActive(String scheduleId, boolean active) {
        jdbc.update(
                "UPDATE rep_core_schedule SET is_active = ? WHERE id = HEXTORAW(?)",
                active ? 1 : 0,
                scheduleId.replace("-", "").toUpperCase()
        );
    }

    // ── Delete ───────────────────────────────────────────────
    public void delete(String scheduleId) {
        jdbc.update(
                "DELETE FROM rep_core_schedule WHERE id = HEXTORAW(?)",
                scheduleId.replace("-", "").toUpperCase()
        );
    }

    // ── Update result after run ──────────────────────────────
    public void updateResult(String scheduleId, String status,
                             String error, String filePath) {
        jdbc.update(
                "UPDATE rep_core_schedule " +
                        "SET last_run = SYSTIMESTAMP, last_status = ?, last_error = ?, last_file = ? " +
                        "WHERE id = HEXTORAW(?)",
                status, error, filePath,
                scheduleId.replace("-", "").toUpperCase()
        );
    }


}
