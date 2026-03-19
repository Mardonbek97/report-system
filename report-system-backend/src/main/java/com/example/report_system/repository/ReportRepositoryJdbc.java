package com.example.report_system.repository;

import com.example.report_system.dto.ReportExecLogDto;
import com.example.report_system.dto.ReportListDto;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.nio.ByteBuffer;
import java.sql.Timestamp;
import java.util.*;

@Repository
public class ReportRepositoryJdbc {

    private final NamedParameterJdbcTemplate namedJdbc;

    public ReportRepositoryJdbc(DataSource dataSource) {
        this.namedJdbc = new NamedParameterJdbcTemplate(dataSource);
    }

    // ── Folderlar ro'yxati (user ga tegishli reportlarning distinct folderlari) ──
    public List<Map<String, Object>> findFolders(boolean isAdmin, Long userId) {
        String userJoin = isAdmin ? "" :
                "JOIN rep_core_access a ON a.rep_id = r.id AND a.user_id = :user_id ";

        String sql =
                "SELECT DISTINCT " +
                        "  LOWER(RAWTOHEX(f.id))   AS folder_id, " +
                        "  f.name                  AS folder_name, " +
                        "  COUNT(r.id) OVER (PARTITION BY f.id) AS report_count " +
                        "FROM rep_core_folder f " +
                        "JOIN rep_core_name r ON r.folder_id = f.id " +
                        userJoin +
                        "ORDER BY f.name ASC";

        Map<String, Object> params = new HashMap<>();
        if (!isAdmin) params.put("user_id", userId);

        // Oracle queryForList uppercase nomlarni lowercase ga o'giramiz
        return namedJdbc.queryForList(sql, params).stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("folderId",    row.get("FOLDER_ID"));
            m.put("folderName",  row.get("FOLDER_NAME"));
            m.put("reportCount", row.get("REPORT_COUNT"));
            return m;
        }).collect(java.util.stream.Collectors.toList());
    }

    // ── Reportlar ro'yxati: ROWNUM pagination, folder filter bilan ──────────
    public List<ReportListDto> findAllPaged(int offset, int rownumMax,
                                            String like, boolean hasSearch,
                                            Boolean isAdmin, Long userId,
                                            String folderId) {

        String userJoin    = !isAdmin ? " JOIN rep_core_access a ON a.rep_id = r.id AND a.user_id = :user_id " : " ";
        String folderJoin  = "LEFT JOIN rep_core_folder f ON f.id = r.folder_id ";

        List<String> conditions = new ArrayList<>();
        if (hasSearch)             conditions.add("LOWER(r.name) LIKE :like");
        if (folderId != null && !folderId.isEmpty())
            conditions.add("LOWER(RAWTOHEX(f.id)) = :folder_id");

        String whereClause = conditions.isEmpty() ? " "
                : " WHERE " + String.join(" AND ", conditions) + " ";

        String innerSql =
                "SELECT r.id, r.name, " +
                        "       LOWER(RAWTOHEX(f.id)) AS folder_id, f.name AS folder_name " +
                        "FROM rep_core_name r " +
                        userJoin +
                        folderJoin +
                        whereClause +
                        "ORDER BY r.name ASC";

        String sql =
                "SELECT * FROM (" +
                        "  SELECT t.*, ROWNUM rn FROM (" + innerSql + ") t" +
                        "  WHERE ROWNUM <= :rownumMax" +
                        ") WHERE rn > :offset";

        Map<String, Object> params = new HashMap<>();
        params.put("rownumMax", rownumMax);
        params.put("offset", offset);
        if (hasSearch) params.put("like", like);
        if (!isAdmin)  params.put("user_id", userId);
        if (folderId != null && !folderId.isEmpty())
            params.put("folder_id", folderId.replace("-", "").toLowerCase());

        return namedJdbc.query(sql, params, (rs, i) -> new ReportListDto(
                toUuid(rs.getBytes("id")),
                rs.getString("name"),
                rs.getString("folder_id") != null ? UUID.fromString(hexToUuidStr(rs.getString("folder_id"))) : null,
                rs.getString("folder_name")
        ));
    }

    // ── Reportlar soni (folder filter bilan) ────────────────────────────────
    public int countAll(String like, boolean hasSearch, Boolean isAdmin, Long userId, String folderId) {

        String userJoin   = !isAdmin ? " JOIN rep_core_access a ON a.rep_id = r.id AND a.user_id = :user_id " : " ";
        String folderJoin = "LEFT JOIN rep_core_folder f ON f.id = r.folder_id ";

        List<String> conditions = new ArrayList<>();
        if (hasSearch)             conditions.add("LOWER(r.name) LIKE :like");
        if (folderId != null && !folderId.isEmpty())
            conditions.add("LOWER(RAWTOHEX(f.id)) = :folder_id");

        String whereClause = conditions.isEmpty() ? " "
                : " WHERE " + String.join(" AND ", conditions) + " ";

        String countSql =
                "SELECT COUNT(*) FROM rep_core_name r " +
                        userJoin + folderJoin + whereClause;

        Map<String, Object> params = new HashMap<>();
        if (hasSearch) params.put("like", like);
        if (!isAdmin)  params.put("user_id", userId);
        if (folderId != null && !folderId.isEmpty())
            params.put("folder_id", folderId.replace("-", "").toLowerCase());

        Integer total = namedJdbc.queryForObject(countSql, params, Integer.class);
        return total != null ? total : 0;
    }

    // ── Execution logs: ROWNUM pagination ────────────────────────────────────
    public List<ReportExecLogDto> findLogsPaged(Long userId, boolean isAdmin,
                                                long minRow, long maxRow) {
        String where = isAdmin ? "" : "WHERE l.user_id = :user_id ";

        String sql =
                "SELECT * FROM ( " +
                        "  SELECT inner_.*, ROWNUM rn FROM ( " +
                        "    SELECT l.id, r.name AS report_name, u.username, l.bg_time, " +
                        "           l.end_time, DECODE(l.status, '1', 'Running', '2', 'Finished', '5', 'Error') AS status, " +
                        "           l.percentage, l.error_msg " +
                        "    FROM rep_core_log l " +
                        "    LEFT JOIN rep_core_name r ON l.rep_id = r.id " +
                        "    LEFT JOIN rep_core_users u ON l.user_id = u.id " +
                        "    " + where +
                        "    ORDER BY l.id DESC " +
                        "  ) inner_ WHERE ROWNUM <= :max_row " +
                        ") WHERE rn > :min_row";

        Map<String, Object> params = new HashMap<>();
        params.put("min_row", minRow);
        params.put("max_row", maxRow);
        if (!isAdmin) params.put("user_id", userId);

        return namedJdbc.query(sql, params, (rs, i) -> new ReportExecLogDto(
                ((Number) rs.getObject("id")).longValue(),
                rs.getString("report_name"),
                rs.getString("username"),
                rs.getTimestamp("bg_time")  != null ? ((Timestamp) rs.getObject("bg_time")).toLocalDateTime()  : null,
                rs.getTimestamp("end_time") != null ? ((Timestamp) rs.getObject("end_time")).toLocalDateTime() : null,
                rs.getString("status"),
                rs.getString("percentage"),
                rs.getString("error_msg")
        ));
    }

    // ── Logs soni ────────────────────────────────────────────────────────────
    public long countLogs(Long userId, boolean isAdmin) {
        String where = isAdmin ? "" : "WHERE l.user_id = :user_id ";
        String countSql = "SELECT COUNT(*) FROM rep_core_log l " + where;

        Map<String, Object> params = new HashMap<>();
        if (!isAdmin) params.put("user_id", userId);

        Long total = namedJdbc.queryForObject(countSql, params, Long.class);
        return total != null ? total : 0L;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    private UUID toUuid(byte[] bytes) {
        if (bytes == null) return null;
        ByteBuffer bb = ByteBuffer.wrap(bytes);
        return new UUID(bb.getLong(), bb.getLong());
    }

    private String hexToUuidStr(String hex) {
        if (hex == null || hex.length() != 32) return null;
        return hex.substring(0, 8) + "-" + hex.substring(8, 12) + "-"
                + hex.substring(12, 16) + "-" + hex.substring(16, 20) + "-" + hex.substring(20);
    }
}