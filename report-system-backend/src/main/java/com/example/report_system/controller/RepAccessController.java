package com.example.report_system.controller;

import com.example.report_system.dto.RepAccessDto;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.service.RepAccessService;
import com.example.report_system.service.ReportService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/access")
@PreAuthorize("hasRole('ADMIN')")
public class RepAccessController {

    private final RepAccessService repAccessService;
    private final ReportService reportService;

    public RepAccessController(RepAccessService repAccessService, ReportService reportService) {
        this.repAccessService = repAccessService;
        this.reportService = reportService;
    }

    @PostMapping("/addReport")
    public String addReport(@RequestHeader("Accept-Language") ApplanguageEnum lang,
                            @RequestBody RepAccessDto request) {
        try {
            if (repAccessService.addAccessReport(request, lang) == 0) {
                return "Report is alredy added";
            }
            return "Successfully added!";
        } catch (Exception e) {
            throw e;
        }
    }

}
