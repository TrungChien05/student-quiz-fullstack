package com.studentquizz.controller;

import com.studentquizz.dto.BadgeResponse;
import com.studentquizz.service.AchievementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/badges")
@RequiredArgsConstructor
public class BadgeController {
    private final AchievementService achievementService;

    @GetMapping("/me")
    public ResponseEntity<List<BadgeResponse>> getMyBadges() {
        return ResponseEntity.ok(achievementService.getMyBadges());
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<List<BadgeResponse>> getUserBadges(@PathVariable Long userId) {
        return ResponseEntity.ok(achievementService.getUserBadges(userId));
    }

    @GetMapping("/me/unseen")
    public ResponseEntity<List<BadgeResponse>> getMyUnseenBadges() {
        return ResponseEntity.ok(achievementService.getMyUnseenBadges());
    }

    @PostMapping("/me/unseen/{userBadgeId}/acknowledge")
    public ResponseEntity<Void> acknowledge(@PathVariable Long userBadgeId) {
        achievementService.acknowledgeBadge(userBadgeId);
        return ResponseEntity.noContent().build();
    }
}
