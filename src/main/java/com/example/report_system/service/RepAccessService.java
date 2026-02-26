package com.example.report_system.service;

import com.example.report_system.dto.RepAccessDto;
import com.example.report_system.entity.RepAccess;
import com.example.report_system.entity.Reports;
import com.example.report_system.entity.Users;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.exception.AppBadException;
import com.example.report_system.repository.RepAccessRepository;
import com.example.report_system.repository.ReportRepository;
import com.example.report_system.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

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

        List<RepAccess> accesses = new ArrayList<>();

        System.out.println(dto);
        for (Long userId : dto.userIds()) {
            Users user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User topilmadi: " + userId));

            if (repAccessRepository.countByUserIdAndRepId(userId, dto.repId()) < 1) {
                RepAccess repAccess = new RepAccess();
                repAccess.setUsers(user);
                repAccess.setReports(report);
                System.out.println( " if ichi "+ dto);

                repAccessRepository.save(repAccess);
            } else {
                return 0;
                //throw new AppBadException("The report already added to this user");
            }
        }
        return 1;
    }
}
