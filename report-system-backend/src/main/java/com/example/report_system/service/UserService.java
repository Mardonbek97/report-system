package com.example.report_system.service;

import com.example.report_system.dto.UserListDto;
import com.example.report_system.repository.UserRepositoryJdbc;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class UserService {

    private final UserRepositoryJdbc userRepositoryJdbc;

    public UserService(UserRepositoryJdbc userRepositoryJdbc) {
        this.userRepositoryJdbc = userRepositoryJdbc;
    }

    public Map<String, Object> getAll(int page, int size, String search) {
        int offset    = page * size;
        int rownumMax = offset + size;
        boolean hasSearch = search != null && !search.trim().isEmpty();
        String like = "%" + (hasSearch ? search.trim().toLowerCase() : "") + "%";

        int total = userRepositoryJdbc.countAll(like, hasSearch);
        List<UserListDto> content = userRepositoryJdbc.findAllPaged(offset, rownumMax, like, hasSearch);
        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 1;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content",       content);
        result.put("totalElements", total);
        result.put("totalPages",    Math.max(1, totalPages));
        result.put("number",        page);
        result.put("size",          size);
        return result;
    }
}
