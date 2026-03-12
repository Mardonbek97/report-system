package com.example.report_system.repository;

import com.example.report_system.dto.ScheduleDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public class ScheduleRepository {

    private final JdbcTemplate jdbc;

    public ScheduleRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ── List — admin barchani, user o'zini ko'radi ──────────
    public List<ScheduleDto> findByUser(Long userId, boolean isAdmin) {
        String where = isAdmin ? "" : "WHERE s.user_id = ? ";
        String sql = "SELECT s.id, s.rep_id, n.name AS rep_name, " +
                "       s.user_id, u.username, s.params, s.file_format, " +
                "       s.cron_expr, s.run_at, s.is_active, " +
                "       s.last_run, s.last_status, s.last_error, s.last_file " +
                "FROM rep_core_schedule s " +
                "JOIN rep_core_name n  ON n.id = s.rep_id " +
                "JOIN rep_core_users u ON u.id = s.user_id " +
                where +
                "ORDER BY s.created_at DESC";

        if (isAdmin) {
            return jdbc.query(sql, (rs, i) -> mapFull(rs));
        } else {
            return jdbc.query(sql, new Object[]{userId}, (rs, i) -> mapFull(rs));
        }
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
