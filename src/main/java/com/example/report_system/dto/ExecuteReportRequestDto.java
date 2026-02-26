package com.example.report_system.dto;

import java.util.Map;
import java.util.UUID;

public record ExecuteReportRequestDto(String username,
                                      UUID repId,
                                      Map<String, String> params) {
}
