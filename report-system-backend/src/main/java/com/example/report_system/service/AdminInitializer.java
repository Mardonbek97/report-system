package com.example.report_system.service;

import com.example.report_system.entity.Users;
import com.example.report_system.enums.UserRoles;
import com.example.report_system.enums.UserStatusEnum;
import com.example.report_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    @Value("${admin.username}")
    private String USERNAME;
    @Value("${admin.password}")
    private String PASSWORD;
    @Value("${admin.email}")
    private String EMAIL;

    public AdminInitializer(UserRepository userRepository,
                            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.countByRole("ROLE_ADMIN") < 1) {
            Users admin = new Users();
            admin.setUsername(USERNAME);
            admin.setPassword(passwordEncoder.encode(PASSWORD));
            admin.setRole(UserRoles.ROLE_ADMIN);
            admin.setStatus(UserStatusEnum.ACTIVE);
            admin.setEmail(EMAIL);
            admin.setEnabled(true);
            userRepository.save(admin);
        }
    }
}
