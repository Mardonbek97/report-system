package com.example.report_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;

@Validated
public record LoginRequestDto(@NotBlank(message = "Username must be provided")
                              String username,
                              @NotBlank(message = "Password must be provided")
                              @Size(min = 7, message = "Password must be at least 7 characters")
                              String password) {
}
