package com.example.report_system.controller;

import com.example.report_system.dto.RepAccessDto;
import com.example.report_system.enums.ApplanguageEnum;
import com.example.report_system.service.RepAccessService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/access")
@PreAuthorize("hasRole('ADMIN')")
public class RepAccessController {

    private final RepAccessService repAccessService;

    public RepAccessController(RepAccessService repAccessService) {
        this.repAccessService = repAccessService;
    }

    @PostMapping("/addReport")
    public String addReport(@RequestHeader("Accept-Language") ApplanguageEnum lang,
                            @RequestBody RepAccessDto request) {
        try {
           if (repAccessService.addAccessReport(request, lang)==0){
               return "Report is alredy added";
            }
            return "Successfully added!";
        } catch (Exception e) {
            throw e;
        }
    }

}
