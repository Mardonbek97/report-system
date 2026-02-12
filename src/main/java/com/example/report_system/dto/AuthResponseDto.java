package com.example.report_system.dto;

import com.example.report_system.enums.UserRoles;
import org.springframework.validation.annotation.Validated;

public record AuthResponseDto(String token,
                              String username,
                              UserRoles role) {
}
