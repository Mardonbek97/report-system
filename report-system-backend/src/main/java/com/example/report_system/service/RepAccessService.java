package com.example.report_system.service;

import com.example.report_system.dto.RepAccessDto;
import com.example.report_system.entity.RepAccess;
import com.example.report_system.entity.Reports;
import com.example.report_system.entity.Users;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.repository.RepAccessRepository;
import com.example.report_system.repository.ReportRepository;
import com.example.report_system.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class RepAccessService {

    private final RepAccessRepository repAccessRepository;
    private final UserRepository userRepository;
    private final ReportRepository reportRepository;

    public RepAccessService(RepAccessRepository repAccessRepository, UserRepository userRepository, ReportRepository reportRepository, ReportService reportService, AdminService adminService, UserRepository userRepository1, ReportRepository reportRepository1) {
        this.repAccessRepository = repAccessRepository;
        this.userRepository = userRepository1;
        this.reportRepository = reportRepository1;
    }

    public int addAccessReport(RepAccessDto dto, ApplanguageEnum lang) {

        Reports report = reportRepository.findById(dto.repId())
                .orElseThrow(() -> new RuntimeException("Report topilmadi"));

        // 1. Hozir DB da bu reportga biriktirilgan barcha user ID lari
        List<Long> existingUserIds = repAccessRepository.findUserIdsByRepId(dto.repId());

        // 2. Yangi tanlangan ID lar
        List<Long> selectedUserIds = dto.userIds();

        // 3. Qo'shish kerak — tanlangan lekin DB da yo'q
        for (Long userId : selectedUserIds) {
            if (!existingUserIds.contains(userId)) {
                Users user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User topilmadi: " + userId));
                RepAccess repAccess = new RepAccess();
                repAccess.setUsers(user);
                repAccess.setReports(report);
                repAccessRepository.save(repAccess);
            }
        }

        // 4. O'chirish kerak — DB da bor lekin hozir tanlanmagan
        for (Long userId : existingUserIds) {
            if (!selectedUserIds.contains(userId)) {
                repAccessRepository.deleteByUserIdAndRepId(userId, dto.repId());
            }
        }

        return 1;
    }


    public List<Long> getAssignedUserIds(UUID repId) {
        return repAccessRepository.findUserIdsByRepId(repId);
    }
}
