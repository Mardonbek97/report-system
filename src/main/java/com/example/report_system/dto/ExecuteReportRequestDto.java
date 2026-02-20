package com.example.report_system.dto;

import java.util.Map;
import java.util.UUID;

public record ExecuteReportRequestDto(Long id,
                                      UUID repId,
                                      Map<String, String> params) {
}
