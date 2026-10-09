package com.studentquizz.controller;

import com.studentquizz.service.SampleDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Tạo dữ liệu mẫu khi cần (dev/local). Tắt trên prod: app.dev.seed-endpoint=false
 */
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.dev.seed-endpoint", havingValue = "true", matchIfMissing = true)
public class DevSeedController {

    private final SampleDataService sampleDataService;

    @PostMapping("/seed-samples")
    public ResponseEntity<Map<String, Object>> seedSamples() {
        Map<String, Object> result = sampleDataService.seedSamplesIfMissing();
        return ResponseEntity.ok(Map.of(
                "message", "Đã kiểm tra và tạo dữ liệu mẫu (nếu thiếu)",
                "data", result
        ));
    }
}
