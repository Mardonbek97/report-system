package com.example.report_system.service;

import com.example.report_system.dto.LoginRequestDto;
import com.example.report_system.entity.Users;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.enums.UserRoles;
import com.example.report_system.enums.UserStatusEnum;
import com.example.report_system.exception.AppBadException;
import com.example.report_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class AdminService {

    @Autowired
    private final UserRepository userRepository;
    @Autowired
    private final PasswordEncoder passwordEncoder;
    @Autowired
    private ResourceBundleMessageSource bundleMessageSource;
    @Value("${admin.username}")
    private String USERNAME;

    public AdminService(UserRepository userRepository,
                        PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void updatePasswordAdmin(LoginRequestDto dto, ApplanguageEnum lang) {

        Users admin = userRepository.findByUsername(dto.username())
                .orElseThrow(() ->
                        new AppBadException(bundleMessageSource.getMessage("auth.admin.exists", null, new Locale(lang.name()))));

        admin.setPassword(passwordEncoder.encode(dto.password()));
        userRepository.save(admin);
    }

}