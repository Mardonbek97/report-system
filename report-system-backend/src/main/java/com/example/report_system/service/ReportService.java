package com.example.report_system.service;

import com.example.report_system.dto.ReportExecLogDto;
import com.example.report_system.dto.ReportListDto;
import com.example.report_system.entity.Users;
import com.example.report_system.repository.ReportRepository;
import com.example.report_system.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ReportService(ReportRepository reportRepository, UserRepository userRepository, JdbcTemplate jdbcTemplate) {
        this.reportRepository = reportRepository;
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> getAllReport(int page, int size, String search) {
        int offset    = page * size;
        int rownumMax = offset + size;
        boolean hasSearch = search != null && !search.trim().isEmpty();
        String like = "%" + (hasSearch ? search.trim().toLowerCase() : "") + "%";

        String whereClause = hasSearch ? " WHERE LOWER(r.name) LIKE ? " : " ";

        // ── Count ──────────────────────────────────────────────────
        String countSql = "SELECT COUNT(*) FROM rep_core_name r" + whereClause;
        Integer total = hasSearch
                ? jdbcTemplate.queryForObject(countSql, Integer.class, like)
                : jdbcTemplate.queryForObject(countSql, Integer.class);
        if (total == null) total = 0;

        // ── Oracle 11g ROWNUM pagination ───────────────────────────
        String innerSql =
                "SELECT r.id, r.name FROM rep_core_name r" + whereClause + "ORDER BY r.name ASC";

        String sql =
                "SELECT * FROM (" +
                        "  SELECT t.*, ROWNUM rn FROM (" + innerSql + ") t" +
                        "  WHERE ROWNUM <= ?" +
                        ") WHERE rn > ?";

        List<ReportListDto> content = hasSearch
                ? jdbcTemplate.query(sql,
                (rs, i) -> new ReportListDto(
                        toUuid(rs.getBytes("id")),
                        rs.getString("name")),
                like, rownumMax, offset)
                : jdbcTemplate.query(sql,
                (rs, i) -> new ReportListDto(
                        toUuid(rs.getBytes("id")),
                        rs.getString("name")),
                rownumMax, offset);

        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 1;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content",       content);
        result.put("totalElements", total);
        result.put("totalPages",    Math.max(1, totalPages));
        result.put("number",        page);
        result.put("size",          size);
        return result;
    }

    public List<ReportListDto> getAllByUser(String username) {
        List<ReportListDto> dto = reportRepository.findAll()
                .stream()
                .map(reports -> new ReportListDto(reports.getId(), reports.getName()))
                .collect(Collectors.toUnmodifiableList());

        /*Bu joyini korib chiqish kerak*/
        return dto;



    }

    public List<ReportListDto> getAllReportByName(String reportName) {
        List<ReportListDto> dto = reportRepository.findByReportName(reportName)
                .stream()
                .map(reports -> new ReportListDto(reports.getId(), reports.getName()))
                .collect(Collectors.toUnmodifiableList());

        return dto;
    }

    public Page<ReportExecLogDto> fetchTempData(String currentUsername, Boolean isAdmin, int page, int size) {

        Optional<Users> userID = userRepository.findByUsername(currentUsername);
        Long userId = userID.get().getId();

        String where = (!isAdmin || !"admin".equals(currentUsername))
                ? "WHERE l.user_id = :user_id " : "";

        // Oracle 11g pagination — ROWNUM bilan ikki qavatli subquery
        String sql = "SELECT * FROM ( " +
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

        String countSql = "SELECT COUNT(*) FROM rep_core_log l " + where;

        Map<String, Object> countParams = new HashMap<>();
        if (!where.isEmpty()) countParams.put("user_id", userId);

        Map<String, Object> queryParams = new HashMap<>(countParams);
        queryParams.put("min_row", (long) page * size);
        queryParams.put("max_row", (long) (page + 1) * size);

        NamedParameterJdbcTemplate namedJdbc = new NamedParameterJdbcTemplate(jdbcTemplate);

        Long total = namedJdbc.queryForObject(countSql, countParams, Long.class);
        if (total == null) total = 0L;

        List<Map<String, Object>> rows = namedJdbc.queryForList(sql, queryParams);

        List<ReportExecLogDto> content = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            content.add(new ReportExecLogDto(
                    ((Number) row.get("ID")).longValue(),
                    (String) row.get("REPORT_NAME"),
                    (String) row.get("USERNAME"),
                    row.get("BG_TIME")  != null ? ((java.sql.Timestamp) row.get("BG_TIME")).toLocalDateTime()  : null,
                    row.get("END_TIME") != null ? ((java.sql.Timestamp) row.get("END_TIME")).toLocalDateTime() : null,
                    (String) row.get("STATUS"),
                    (String) row.get("PERCENTAGE"),
                    (String) row.get("ERROR_MSG")
            ));
        }

        return new PageImpl<>(content, PageRequest.of(page, size), total);
    }

    private java.util.UUID toUuid(byte[] bytes) {
        if (bytes == null) return null;
        java.nio.ByteBuffer bb = java.nio.ByteBuffer.wrap(bytes);
        return new java.util.UUID(bb.getLong(), bb.getLong());
    }

}
