package com.example.report_system.service;

import com.example.report_system.dto.ReportListDto;
import com.example.report_system.repository.ReportRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final ReportRepository reportRepository;

    public ReportService(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    public List<ReportListDto> getAllReport() {
        List<ReportListDto> dto = reportRepository.findAll()
                .stream()
                .map(reports -> new ReportListDto(reports.getId(), reports.getName()))
                .collect(Collectors.toUnmodifiableList());

        return dto;
    }

    public List<ReportListDto> getAllReportByName(String reportName) {
        List<ReportListDto> dto = reportRepository.findByReportName(reportName)
                .stream()
                .map(reports -> new ReportListDto(reports.getId(), reports.getName()))
                .collect(Collectors.toUnmodifiableList());

        return dto;
    }


}
