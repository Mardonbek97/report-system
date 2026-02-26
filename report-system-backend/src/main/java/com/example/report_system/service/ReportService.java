package com.example.report_system.service;

import com.example.report_system.dto.ReportExecLogDto;
import com.example.report_system.dto.ReportListDto;
import com.example.report_system.entity.Users;
import com.example.report_system.repository.ReportRepository;
import com.example.report_system.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    public List<ReportListDto> getAllReport() {
        List<ReportListDto> dto = reportRepository.findAll()
                .stream()
                .map(reports -> new ReportListDto(reports.getId(), reports.getName()))
                .collect(Collectors.toUnmodifiableList());

        return dto;
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

    public List<ReportExecLogDto> fetchTempData(String currentUsername, Boolean isAdmin) {

        Optional<Users> userID = userRepository.findByUsername(currentUsername);
        Long userId = userID.get().getId();

        String sql = "SELECT l.id, r.name AS report_name, u.username, l.bg_time, " +
                "       l.end_time, DECODE(l.status, '1', 'Running', '2', 'Finished', '5', 'Error') AS status, " +
                "       l.percentage, l.error_msg " +
                "FROM rep_core_log l " +
                "LEFT JOIN rep_core_name r ON l.rep_id = r.id " +
                "LEFT JOIN rep_core_users u ON l.user_id = u.id ";

        Map<String, Object> params = new HashMap<>();

        if (!isAdmin) {
            sql += "WHERE l.user_id = :user_id ";
            params.put("user_id", userId);
        }

        sql += "ORDER BY l.id DESC";

        List<Map<String, Object>> rows = new NamedParameterJdbcTemplate(jdbcTemplate)
                .queryForList(sql, params);

        List<ReportExecLogDto> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            ReportExecLogDto dto = new ReportExecLogDto(
                    ((Number) row.get("ID")).longValue(),
                    (String) row.get("REPORT_NAME"),
                    (String) row.get("USERNAME"),
                    row.get("BG_TIME") != null ? ((java.sql.Timestamp) row.get("BG_TIME")).toLocalDateTime() : null,
                    row.get("END_TIME") != null ? ((java.sql.Timestamp) row.get("END_TIME")).toLocalDateTime() : null,
                    (String) row.get("STATUS"),
                    (String) row.get("PERCENTAGE"),
                    (String) row.get("ERROR_MSG")
            );
            result.add(dto);
        }

        return result;
    }


}
