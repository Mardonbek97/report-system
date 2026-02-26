package com.example.report_system.controller;

import com.example.report_system.dto.*;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.service.AdminService;
import com.example.report_system.service.AuthService;
import com.example.report_system.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final UserService userService;
    private final AuthService authService;

    public AdminController(AdminService adminService, UserService userService, AuthService authService) {
        this.userService = userService;
        this.authService = authService;
        this.adminService = adminService;
    }


    @PostMapping("/users")
    public ResponseEntity<AuthResponseDto> register(@RequestHeader("Accept-Language") ApplanguageEnum lang,
                                                    @RequestBody RegisterRequestDto request) {
        AuthResponseDto response = authService.register(lang, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/update")
    public String register(@RequestHeader("Accept-Language") ApplanguageEnum lang,
                           @RequestBody LoginRequestDto dto) {
        try {
            adminService.updatePassword(dto, lang);
            return "Succesfully updated password!!!";
        } catch (Exception e) {
            throw e;
        }
    }

    @GetMapping("/userslist")
    public List<UserListDto> findAll() {
        try {
            return userService.getAll();
        } catch (Exception e) {
            throw e;
        }
    }

    @PostMapping("/block")
    public String bock(@RequestBody UserDto request) {
        adminService.block(request);
        return "Successfully updated!";
    }

    @PostMapping("/add")
    public String add(@RequestBody UserAddDto request) {
        System.out.println(request);
        adminService.add(request);
        return "Successfully updated!";
    }

}
