package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    @GetMapping("/test")
    public ResponseEntity<String> testReportingEndpoint() {
        return ResponseEntity.ok("Raporlama endpoint'i çalışıyor. İleride Excel ve PDF raporları buradan servis edilecek.");
    }
}
