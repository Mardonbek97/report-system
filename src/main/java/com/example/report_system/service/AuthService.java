package com.example.report_system.service;

import com.example.report_system.config.JwtUtil;
import com.example.report_system.config.LanguageConfig;
import com.example.report_system.dto.AuthResponseDto;
import com.example.report_system.dto.LoginRequestDto;
import com.example.report_system.dto.RegisterRequestDto;
import com.example.report_system.entity.Users;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.enums.UserRoles;
import com.example.report_system.enums.UserStatusEnum;
import com.example.report_system.exception.AppBadException;
import com.example.report_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class AuthService {

    @Autowired
    private final UserRepository userRepository;
    @Autowired
    private final PasswordEncoder passwordEncoder;
    @Autowired
    private final JwtUtil jwtUtil;
    @Autowired
    private final LanguageConfig languageConfig;
    @Autowired
    private ResourceBundleMessageSource bundleMessageSource;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil, LanguageConfig languageConfig) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.languageConfig = languageConfig;
    }

    public AuthResponseDto register(ApplanguageEnum lang, RegisterRequestDto request) {
        if (userRepository.countByUsername(request.username()) > 0) {
            throw new AppBadException(bundleMessageSource.getMessage("auth.username.exists", null, new Locale(lang.name())));
        }

        Users user = new Users();
        user.setUsername(request.username());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(UserRoles.ROLE_USER);
        user.setStatus(UserStatusEnum.ACTIVE);
        user.setEnabled(true);

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());

        return new AuthResponseDto(token, user.getUsername(), user.getRole());
    }


    public AuthResponseDto login(LoginRequestDto request, ApplanguageEnum lang) {
        Users user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new AppBadException(bundleMessageSource.getMessage("auth.username.exists", null, new Locale(lang.name()))));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new AppBadException(bundleMessageSource.getMessage("auth.usernameOrPassword.exists", null, new Locale(lang.name())));
        }

        if (!user.getEnabled()) {
            throw new AppBadException(bundleMessageSource.getMessage("auth.username.status", null, new Locale(lang.name())));
        }

        String token = jwtUtil.generateToken(user.getUsername());

        return new AuthResponseDto(token, user.getUsername(), user.getRole());
    }


}

