package com.studentquizz.controller;

import com.studentquizz.dto.LeaderboardDto;
import com.studentquizz.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/leaderboards")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    @GetMapping("/active")
    public ResponseEntity<List<LeaderboardDto>> getMostActive(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(leaderboardService.getMostActive(limit));
    }

    @GetMapping("/scores")
    public ResponseEntity<List<LeaderboardDto>> getTopScoring(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(leaderboardService.getTopScoring(limit));
    }
}
