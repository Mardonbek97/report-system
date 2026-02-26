package com.example.report_system.dto;

import java.util.UUID;

public record ExeecRepDto(UUID repId,
                          Long user,
                          String params
) {
}
