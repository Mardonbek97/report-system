package com.example.report_system.dto;

import com.example.report_system.enums.UserRoles;
import com.example.report_system.enums.UserStatusEnum;

import java.time.LocalDateTime;

public record UserListDto(Long id,
                          String username,
                          String email,
                          UserStatusEnum status,
                          UserRoles role,
                          LocalDateTime createdAt) {
}
