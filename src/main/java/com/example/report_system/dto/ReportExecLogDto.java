package com.example.report_system.dto;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

public record ReportExecLogDto(Long id,
                               String reportName,
                               String username,
                               LocalDateTime beginTime,
                               LocalDateTime endTime,
                               String status,
                               String percentage,
                               String errorMessage) {

}
