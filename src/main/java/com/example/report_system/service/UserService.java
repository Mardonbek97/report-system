package com.example.report_system.service;

import com.example.report_system.dto.UserListDto;
import com.example.report_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserListDto> getAll() {
        List<UserListDto> usersDto = userRepository.findAll()
                .stream()
                .map(u-> new UserListDto(
                        u.getId(),
                        u.getUsername(),
                        u.getEmail(),
                        u.getStatus(),
                        u.getRole(),
                        u.getCreatedAt()))
                .collect(Collectors.toUnmodifiableList());

        return usersDto;
    }
}
