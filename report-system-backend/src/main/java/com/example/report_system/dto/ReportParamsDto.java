package com.example.report_system.dto;

import java.util.List;
import java.util.Map;

public record ReportParamsDto(String paramName,
                              String paramType,
                              String paramView,
                              String defaultValue) {
}
