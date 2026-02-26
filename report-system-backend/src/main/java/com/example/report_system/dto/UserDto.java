package com.example.report_system.dto;

import com.example.report_system.enums.UserStatusEnum;

public record UserDto(String username,
                      UserStatusEnum statusEnum) {
}
