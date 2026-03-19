package com.example.report_system.repository;

import com.example.report_system.dto.ScheduleDto;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Repository
public class ScheduleRepositoryJdbc {

    private final DataSource dataSource;

    public ScheduleRepositoryJdbc(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // ── INSERT ───────────────────────────────────────────────────────────────
    public void save(ScheduleDto dto, Long userId) {
        String sql =
                "INSERT INTO rep_core_schedule " +
                        "  (id, rep_id, user_id, params, file_format, cron_expr, run_at, is_active, is_deleted) " +
                        "VALUES (SYS_GUID(), HEXTORAW(?), ?, ?, ?, ?, ?, 1, 0)";

        execute(sql,
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

    // ── Toggle active/inactive ───────────────────────────────────────────────
    public void toggleActive(String scheduleId, boolean active) {
        execute(
                "UPDATE rep_core_schedule SET is_active = ? WHERE id = HEXTORAW(?)",
                active ? 1 : 0,
                toHex(scheduleId)
        );
    }

    // ── Soft delete (is_deleted = 1) ─────────────────────────────────────────
    public void softDelete(String scheduleId) {
        execute(
                "UPDATE rep_core_schedule SET is_deleted = 1, is_active = 0 WHERE id = HEXTORAW(?)",
                toHex(scheduleId)
        );
    }

    // ── Hard delete (kerak bo'lsa) ────────────────────────────────────────────
    public void delete(String scheduleId) {
        execute(
                "DELETE FROM rep_core_schedule WHERE id = HEXTORAW(?)",
                toHex(scheduleId)
        );
    }

    // ── Job ishlangandan so'ng natijani yozish ───────────────────────────────
    public void updateResult(String scheduleId, String status, String error, String filePath) {
        execute(
                "UPDATE rep_core_schedule " +
                        "SET last_run = SYSTIMESTAMP, last_status = ?, last_error = ?, last_file = ? " +
                        "WHERE id = HEXTORAW(?)",
                status, error, filePath,
                toHex(scheduleId)
        );
    }

    // ── Pagination bilan ro'yxat (is_deleted = 0 lar) ───────────────────────
    public List<ScheduleDto> findAllPaged(Long userId, boolean isAdmin,
                                          int offset, int rownumMax,
                                          String like, boolean hasSearch) {
        String userWhere   = isAdmin ? "" : "AND s.user_id = ? ";
        String searchWhere = hasSearch ? "AND (LOWER(n.name) LIKE ? OR LOWER(u.username) LIKE ?) " : "";

        String innerSql =
                "SELECT s.id, s.rep_id, n.name AS rep_name, " +
                        "       s.user_id, u.username, s.params, s.file_format, " +
                        "       s.cron_expr, s.run_at, s.is_active, s.is_deleted, " +
                        "       s.last_run, s.last_status, s.last_error, s.last_file " +
                        "FROM rep_core_schedule s " +
                        "JOIN rep_core_name n  ON n.id = s.rep_id " +
                        "JOIN rep_core_users u ON u.id = s.user_id " +
                        "WHERE 1=1 " +
                        (isAdmin ? "" : "AND (s.is_deleted IS NULL OR s.is_deleted = 0) ") +
                        userWhere + searchWhere +
                        "ORDER BY s.created_at DESC";

        String sql =
                "SELECT * FROM (" +
                        "  SELECT t.*, ROWNUM rn FROM (" + innerSql + ") t" +
                        "  WHERE ROWNUM <= ?" +
                        ") WHERE rn > ?";

        List<Object> params = buildParams(userId, isAdmin, like, hasSearch);
        params.add(rownumMax);
        params.add(offset);

        return query(sql, params, (rs, i) -> mapFull(rs));
    }

    // ── Pagination uchun count (is_deleted = 0 lar) ──────────────────────────
    public int countAll(Long userId, boolean isAdmin, String like, boolean hasSearch) {
        String userWhere   = isAdmin ? "" : "AND s.user_id = ? ";
        String searchWhere = hasSearch ? "AND (LOWER(n.name) LIKE ? OR LOWER(u.username) LIKE ?) " : "";

        String countSql =
                "SELECT COUNT(*) FROM rep_core_schedule s " +
                        "JOIN rep_core_name n  ON n.id = s.rep_id " +
                        "JOIN rep_core_users u ON u.id = s.user_id " +
                        "WHERE 1=1 " +
                        (isAdmin ? "" : "AND (s.is_deleted IS NULL OR s.is_deleted = 0) ") +
                        userWhere + searchWhere;

        List<Object> params = buildParams(userId, isAdmin, like, hasSearch);
        return queryForInt(countSql, params);
    }

    // ── One-time: vaqti kelgan, hali ishlamagan (is_deleted = 0) ────────────
    public List<ScheduleDto> findDueOnetime() {
        String sql =
                "SELECT s.id, s.rep_id, s.user_id, u.username, " +
                        "       s.params, s.file_format, s.cron_expr, s.run_at, n.name AS rep_name " +
                        "FROM rep_core_schedule s " +
                        "JOIN rep_core_users u ON u.id = s.user_id " +
                        "JOIN rep_core_name n  ON n.id = s.rep_id " +
                        "WHERE s.is_active = 1 " +
                        "  AND (s.is_deleted IS NULL OR s.is_deleted = 0) " +
                        "  AND s.cron_expr IS NULL " +
                        "  AND s.run_at <= SYSTIMESTAMP " +
                        "  AND (s.last_run IS NULL OR s.last_run < s.run_at)";

        return query(sql, List.of(), (rs, i) -> mapMinimal(rs));
    }

    // ── Cron: barcha active schedulelar (is_deleted = 0) ────────────────────
    public List<ScheduleDto> findActiveCron() {
        String sql =
                "SELECT s.id, s.rep_id, s.user_id, u.username, " +
                        "       s.params, s.file_format, s.cron_expr, s.run_at, n.name AS rep_name " +
                        "FROM rep_core_schedule s " +
                        "JOIN rep_core_users u ON u.id = s.user_id " +
                        "JOIN rep_core_name n  ON n.id = s.rep_id " +
                        "WHERE s.is_active = 1 " +
                        "  AND (s.is_deleted IS NULL OR s.is_deleted = 0) " +
                        "  AND s.cron_expr IS NOT NULL";

        return query(sql, List.of(), (rs, i) -> mapMinimal(rs));
    }

    // ── Mappers ──────────────────────────────────────────────────────────────

    private ScheduleDto mapFull(ResultSet rs) throws SQLException {
        ScheduleDto d = mapMinimal(rs);
        d.setRepName(rs.getString("rep_name"));
        d.setActive(rs.getInt("is_active") == 1);
        d.setDeleted(rs.getObject("is_deleted") != null && rs.getInt("is_deleted") == 1);
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
        // rep_name mavjud bo'lsa o'qiymiz
        try { d.setRepName(rs.getString("rep_name")); } catch (Exception ignored) {}
        return d;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private List<Object> buildParams(Long userId, boolean isAdmin, String like, boolean hasSearch) {
        List<Object> params = new ArrayList<>();
        if (!isAdmin)  params.add(userId);
        if (hasSearch) { params.add(like); params.add(like); }
        return params;
    }

    private void execute(String sql, Object... args) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < args.length; i++) {
                ps.setObject(i + 1, args[i]);
            }
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Schedule DB xatosi: " + e.getMessage(), e);
        }
    }

    @FunctionalInterface
    private interface RowMapper<T> {
        T map(ResultSet rs, int rowNum) throws SQLException;
    }

    private <T> List<T> query(String sql, List<Object> params, RowMapper<T> mapper) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }
            List<T> result = new ArrayList<>();
            try (ResultSet rs = ps.executeQuery()) {
                int i = 0;
                while (rs.next()) result.add(mapper.map(rs, i++));
            }
            return result;
        } catch (SQLException e) {
            throw new RuntimeException("Schedule query xatosi: " + e.getMessage(), e);
        }
    }

    private int queryForInt(String sql, List<Object> params) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getInt(1) : 0;
            }
        } catch (SQLException e) {
            throw new RuntimeException("Count query xatosi: " + e.getMessage(), e);
        }
    }

    private String toHex(String uuid) {
        return uuid.replace("-", "").toUpperCase();
    }

    private String bytesToUuid(byte[] bytes) {
        if (bytes == null) return null;
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        String h = sb.toString();
        return h.substring(0, 8) + "-" + h.substring(8, 12) + "-"
                + h.substring(12, 16) + "-" + h.substring(16, 20) + "-" + h.substring(20);
    }
}