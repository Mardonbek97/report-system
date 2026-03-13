package com.example.report_system.service;

import com.example.report_system.dto.UserListDto;
import com.example.report_system.enums.UserStatusEnum;
import com.example.report_system.enums.UserRoles;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@Service
public class UserService {

    private final JdbcTemplate jdbc;

    public UserService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Map<String, Object> getAll(int page, int size, String search) {
        int offset    = page * size;
        int rownumMax = offset + size;
        boolean hasSearch = search != null && !search.trim().isEmpty();
        String like = "%" + (hasSearch ? search.trim().toLowerCase() : "") + "%";

        // Users entity dagi @Table(name=?) va @Column(name=?) ga qarab o'zgartiring:
        // Quyida REP_CORE_USERS table va uning ustunlari ishlatilgan
        String whereClause = hasSearch
                ? " WHERE LOWER(u.username) LIKE ? OR LOWER(u.email) LIKE ? " : " ";

        // ── Count ──────────────────────────────────────────────
        String countSql = "SELECT COUNT(*) FROM rep_core_users u" + whereClause;
        Integer total = hasSearch
                ? jdbc.queryForObject(countSql, Integer.class, like, like)
                : jdbc.queryForObject(countSql, Integer.class);
        if (total == null) total = 0;

        // ── Data (Oracle 11g ROWNUM) ───────────────────────────
        String innerSql =
                "SELECT u.id, u.username, u.email, u.status, u.role, u.created_at " +
                        "FROM rep_core_users u" + whereClause +
                        "ORDER BY u.created_at DESC";

        String sql =
                "SELECT * FROM (" +
                        "  SELECT t.*, ROWNUM rn FROM (" + innerSql + ") t" +
                        "  WHERE ROWNUM <= ?" +
                        ") WHERE rn > ?";

        List<UserListDto> content;
        try {
            if (hasSearch) {
                content = jdbc.query(sql,
                        (rs, i) -> map(rs),
                        like, like, rownumMax, offset);
            } else {
                content = jdbc.query(sql,
                        (rs, i) -> map(rs),
                        rownumMax, offset);
            }
        } catch (Exception e) {
            throw new RuntimeException("SQL xatosi: " + e.getMessage(), e);
        }

        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 1;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content",       content);
        result.put("totalElements", total);
        result.put("totalPages",    Math.max(1, totalPages));
        result.put("number",        page);
        result.put("size",          size);
        return result;
    }

    private UserListDto map(java.sql.ResultSet rs) throws java.sql.SQLException {
        Long id = rs.getLong("id");
        UserStatusEnum status = parseStatus(rs.getString("status"));
        UserRoles      role   = parseRole(rs.getString("role"));
        java.sql.Timestamp ts = rs.getTimestamp("created_at");
        java.time.LocalDateTime createdAt = ts != null ? ts.toLocalDateTime() : null;
        return new UserListDto(id, rs.getString("username"), rs.getString("email"), status, role, createdAt);
    }

    // DB da "ACTIVE" yoki "0","1","2" bo'lishi mumkin
    private UserStatusEnum parseStatus(String val) {
        if (val == null) return null;
        try { return UserStatusEnum.valueOf(val); } catch (Exception ignored) {}
        try {
            int idx = Integer.parseInt(val.trim());
            UserStatusEnum[] vals = UserStatusEnum.values();
            return idx >= 0 && idx < vals.length ? vals[idx] : null;
        } catch (Exception ignored) {}
        return null;
    }

    private UserRoles parseRole(String val) {
        if (val == null) return null;
        try { return UserRoles.valueOf(val); } catch (Exception ignored) {}
        try {
            int idx = Integer.parseInt(val.trim());
            UserRoles[] vals = UserRoles.values();
            return idx >= 0 && idx < vals.length ? vals[idx] : null;
        } catch (Exception ignored) {}
        return null;
    }
}