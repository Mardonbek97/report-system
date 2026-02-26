package com.example.report_system.dto;

import com.example.report_system.entity.Reports;
import com.example.report_system.entity.Users;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record RepAccessDto(
        @NotNull(message = "userId must be filled")
        List<Long> userIds,

        @NotNull(message = "repId must be filled")
        UUID repId) {
}
