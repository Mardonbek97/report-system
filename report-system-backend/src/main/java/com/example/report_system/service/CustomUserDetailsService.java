package com.example.report_system.service;

import com.example.report_system.entity.Users;
import com.example.report_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    @Autowired
    private UserRepository profileRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // username = login or phone or email
        Optional<Users> optional = profileRepository.findByUsername(username);
        if (optional.isEmpty()) {
            throw new UsernameNotFoundException(username);
        }
        Users user = optional.get();
        //CustomUserDetails customUserDetails = new CustomUserDetails(user.getId(), user.getUsername(), user.getPassword(), user.getEmail(), user.getRole().toString(), user.getEnabled());
        CustomUserDetails customUserDetails = CustomUserDetails.build(user);

        return customUserDetails;
    }
}