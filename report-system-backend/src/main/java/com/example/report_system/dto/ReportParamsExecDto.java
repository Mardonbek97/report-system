package com.example.report_system.dto;

import java.util.List;
import java.util.Map;

public record ReportParamsExecDto(String paramName,
                                  String paramType,
                                  String paramView,
                                  String defaultValue,
                                  List<Map<String, Object>> options) {
}
