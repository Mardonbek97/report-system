package com.example.report_system.service;

import com.example.report_system.dto.ReportExecLogDto;
import com.example.report_system.dto.ReportListDto;
import com.example.report_system.entity.Users;
import com.example.report_system.repository.ReportRepository;
import com.example.report_system.repository.ReportRepositoryJdbc;
import com.example.report_system.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final ReportRepository       reportRepository;
    private final ReportRepositoryJdbc reportRepositoryJdbc;
    private final UserRepository         userRepository;

    public ReportService(ReportRepository reportRepository,
                         ReportRepositoryJdbc reportRepositoryJdbc,
                         UserRepository userRepository) {
        this.reportRepository       = reportRepository;
        this.reportRepositoryJdbc = reportRepositoryJdbc;
        this.userRepository         = userRepository;
    }

    // ── Admin: pagination bilan barcha reportlar ─────────────────────────────
    public Map<String, Object> getAllReport(int page, int size, String search, Boolean isAdmin, String username) {
        int offset    = page * size;
        int rownumMax = offset + size;
        boolean hasSearch = search != null && !search.trim().isEmpty();
        String like = "%" + (hasSearch ? search.trim().toLowerCase() : "") + "%";

        Optional<Users> user = userRepository.findByUsername(username);
        Long userId = user.get().getId();

        int total = reportRepositoryJdbc.countAll(like, hasSearch, isAdmin, userId);
        List<ReportListDto> content = reportRepositoryJdbc.findAllPaged(offset, rownumMax, like, hasSearch, isAdmin, userId);
        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 1;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content",       content);
        result.put("totalElements", total);
        result.put("totalPages",    Math.max(1, totalPages));
        result.put("number",        page);
        result.put("size",          size);
        return result;
    }

    // ── User ga tegishli reportlar (JPA — simple query) ──────────────────────
    public List<ReportListDto> getAllByUser(String username) {
        return reportRepository.findAll()
                .stream()
                .map(r -> new ReportListDto(r.getId(), r.getName()))
                .collect(Collectors.toUnmodifiableList());
    }

    // ── Ism bo'yicha qidirish ────────────────────────────────────────────────
    public List<ReportListDto> getAllReportByName(String reportName) {
        return reportRepository.findByReportName(reportName)
                .stream()
                .map(r -> new ReportListDto(r.getId(), r.getName()))
                .collect(Collectors.toUnmodifiableList());
    }

    // ── Execution logs ───────────────────────────────────────────────────────
    // GTT EMAS — rep_core_log oddiy jadval, repositoryda xavfsiz
    public Page<ReportExecLogDto> fetchTempData(String currentUsername, Boolean isAdmin, int page, int size) {
        Long userId = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User topilmadi: " + currentUsername))
                .getId();

        long minRow = (long) page * size;
        long maxRow = (long) (page + 1) * size;

        long total   = reportRepositoryJdbc.countLogs(userId, isAdmin);
        List<ReportExecLogDto> content = reportRepositoryJdbc.findLogsPaged(userId, isAdmin, minRow, maxRow);

        return new PageImpl<>(content, PageRequest.of(page, size), total);
    }
}
