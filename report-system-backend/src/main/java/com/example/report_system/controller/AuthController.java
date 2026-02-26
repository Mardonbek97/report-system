package com.example.report_system.controller;

import com.example.report_system.dto.AuthResponseDto;
import com.example.report_system.dto.LoginRequestDto;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.service.AuthService;
import jakarta.annotation.security.PermitAll;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@RequestBody LoginRequestDto request, @RequestHeader("Accept-Language") ApplanguageEnum lang) {
        return ResponseEntity.ok(authService.login(request, lang));
    }

    @PostMapping("/update")
    public String update(@RequestBody LoginRequestDto request) {
        authService.update(request);
        return "Successfully updated!";
    }


}
