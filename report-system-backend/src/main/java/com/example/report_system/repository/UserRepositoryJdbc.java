package com.example.report_system.repository;

import com.example.report_system.dto.UserListDto;
import com.example.report_system.enums.UserRoles;
import com.example.report_system.enums.UserStatusEnum;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public class UserRepositoryJdbc {

    private final JdbcTemplate jdbc;

    public UserRepositoryJdbc(DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
    }

    // ── Pagination bilan barcha userlarni olish ──────────────────────────────
    public List<UserListDto> findAllPaged(int offset, int rownumMax, String like, boolean hasSearch) {
        String whereClause = hasSearch
                ? " WHERE LOWER(u.username) LIKE ? OR LOWER(u.email) LIKE ? "
                : " ";

        String innerSql =
                "SELECT u.id, u.username, u.email, u.status, u.role, u.created_at " +
                "FROM rep_core_users u" + whereClause +
                "ORDER BY u.created_at DESC";

        String sql =
                "SELECT * FROM (" +
                "  SELECT t.*, ROWNUM rn FROM (" + innerSql + ") t" +
                "  WHERE ROWNUM <= ?" +
                ") WHERE rn > ?";

        if (hasSearch) {
            return jdbc.query(sql, (rs, i) -> mapRow(rs), like, like, rownumMax, offset);
        }
        return jdbc.query(sql, (rs, i) -> mapRow(rs), rownumMax, offset);
    }

    // ── Umumiy sonni hisoblash ───────────────────────────────────────────────
    public int countAll(String like, boolean hasSearch) {
        String whereClause = hasSearch
                ? " WHERE LOWER(u.username) LIKE ? OR LOWER(u.email) LIKE ? "
                : " ";

        String countSql = "SELECT COUNT(*) FROM rep_core_users u" + whereClause;

        Integer total = hasSearch
                ? jdbc.queryForObject(countSql, Integer.class, like, like)
                : jdbc.queryForObject(countSql, Integer.class);

        return total != null ? total : 0;
    }

    // ── ResultSet → UserListDto ──────────────────────────────────────────────
    private UserListDto mapRow(ResultSet rs) throws SQLException {
        Long id = rs.getLong("id");
        UserStatusEnum status = parseStatus(rs.getString("status"));
        UserRoles role = parseRole(rs.getString("role"));
        Timestamp ts = rs.getTimestamp("created_at");
        LocalDateTime createdAt = ts != null ? ts.toLocalDateTime() : null;
        return new UserListDto(id, rs.getString("username"), rs.getString("email"), status, role, createdAt);
    }

    // ── Status parse: "ACTIVE" yoki "0","1","2" ──────────────────────────────
    private UserStatusEnum parseStatus(String val) {
        if (val == null) return null;
        try { return UserStatusEnum.valueOf(val); } catch (Exception ignored) {}
        try {
            int idx = Integer.parseInt(val.trim());
            UserStatusEnum[] vals = UserStatusEnum.values();
            return (idx >= 0 && idx < vals.length) ? vals[idx] : null;
        } catch (Exception ignored) {}
        return null;
    }

    // ── Role parse: "ROLE_ADMIN" yoki "0","1" ───────────────────────────────
    private UserRoles parseRole(String val) {
        if (val == null) return null;
        try { return UserRoles.valueOf(val); } catch (Exception ignored) {}
        try {
            int idx = Integer.parseInt(val.trim());
            UserRoles[] vals = UserRoles.values();
            return (idx >= 0 && idx < vals.length) ? vals[idx] : null;
        } catch (Exception ignored) {}
        return null;
    }
}
