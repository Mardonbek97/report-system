package com.example.report_system.controller;

import com.example.report_system.dto.AuthResponseDto;
import com.example.report_system.dto.LoginRequestDto;
import com.example.report_system.dto.RegisterRequestDto;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.service.AdminService;
import com.example.report_system.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final AuthService authService;

    public AdminController(AdminService adminService, AuthService authService) {
        this.authService = authService;
        this.adminService = adminService;
    }


    @PostMapping("/password")
    public String register(@RequestHeader("Accept-Language") ApplanguageEnum lang,
                           @RequestBody LoginRequestDto dto) {
        try {
            adminService.updatePasswordAdmin(dto, lang);
            return "Succesfully registered!!!";
        } catch (Exception e) {
            throw e;
        }
    }

    @PostMapping("/registerUser")
    public ResponseEntity<AuthResponseDto> register(@RequestHeader("Accept-Language") ApplanguageEnum lang,
                                                    @RequestBody RegisterRequestDto request) {
            AuthResponseDto response = authService.register(lang, request);
            return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@RequestBody LoginRequestDto request, @RequestHeader("Accept-Language") ApplanguageEnum lang) {
        return ResponseEntity.ok(authService.login(request, lang));
    }


}
