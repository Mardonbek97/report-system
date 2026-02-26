package com.example.report_system.service;

import com.example.report_system.dto.LoginRequestDto;
import com.example.report_system.dto.UserAddDto;
import com.example.report_system.dto.UserDto;
import com.example.report_system.entity.Users;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.enums.UserStatusEnum;
import com.example.report_system.exception.AppBadException;
import com.example.report_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Optional;

@Service
public class AdminService {

    @Autowired
    private final UserRepository userRepository;
    @Autowired
    private final PasswordEncoder passwordEncoder;
    @Autowired
    private ResourceBundleMessageSource bundleMessageSource;

    public AdminService(UserRepository userRepository,
                        PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void updatePassword(LoginRequestDto dto, ApplanguageEnum lang) {
        Users user = userRepository.findByUsername(dto.username())
                .orElseThrow(() ->
                        new AppBadException(bundleMessageSource.getMessage("auth.usernameOrPassword.exists", null, new Locale(lang.name()))));

        user.setPassword(passwordEncoder.encode(dto.password()));
        userRepository.save(user);
    }

    public void block(UserDto request) {

        Optional<Users> userOpt = userRepository.findByUsername(request.username());

        if (userOpt.isEmpty()) {
            throw new AppBadException("Username not found!!!");
        }

        Users user = userOpt.get();
        user.setStatus(request.statusEnum());

        userRepository.save(user);

    }

    public String add(UserAddDto dto) {
        Optional<Users> userOpt = userRepository.findByUsername(dto.username());

        if (!userOpt.isEmpty()) {
            throw new AppBadException("Username found like this!!!");
        }

        Users user = new Users();
        user.setUsername(dto.username());
        user.setEmail(dto.mail());
        user.setPassword(passwordEncoder.encode(dto.password()));
        user.setStatus(UserStatusEnum.ACTIVE);
        user.setEnabled(true);

        userRepository.save(user);
        return "Succesfull";
    }


}