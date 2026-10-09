package com.studentquizz.service;

import com.studentquizz.dto.BadgeResponse;
import com.studentquizz.model.Badge;
import com.studentquizz.model.QuizAttempt;
import com.studentquizz.model.User;
import com.studentquizz.model.UserBadge;
import com.studentquizz.repository.BadgeRepository;
import com.studentquizz.repository.ForumPostRepository;
import com.studentquizz.repository.QuizAttemptRepository;
import com.studentquizz.repository.UserBadgeRepository;
import com.studentquizz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AchievementService {
    private static final ZoneId APP_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final UserRepository userRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final ForumPostRepository forumPostRepository;
    private final BadgeRepository badgeRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final NotificationService notificationService;

    @Transactional
    public void recordQuizActivity(Long userId, QuizAttempt attempt) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        LocalDate today = LocalDate.now(APP_TIME_ZONE);
        LocalDate previousActivity = user.getLastActivityDate();

        if (!today.equals(previousActivity)) {
            int previousStreak = valueOrZero(user.getCurrentStreak());
            int currentStreak = today.minusDays(1).equals(previousActivity) ? previousStreak + 1 : 1;
            user.setCurrentStreak(currentStreak);
            user.setLongestStreak(Math.max(valueOrZero(user.getLongestStreak()), currentStreak));
            user.setLastActivityDate(today);
            userRepository.save(user);
        }

        if (quizAttemptRepository.countByUserId(userId) >= 1) {
            awardIfMissing(user, BadgeCatalogService.ROOKIE);
        }
        if (valueOrZero(user.getCurrentStreak()) >= 7) {
            awardIfMissing(user, BadgeCatalogService.STREAK_7);
        }
        if (Integer.valueOf(10).equals(attempt.getScore()) && Integer.valueOf(10).equals(attempt.getTotalQuestions())) {
            awardIfMissing(user, BadgeCatalogService.PERFECT_10);
        }
    }

    @Transactional
    public void evaluateForumBadges(Long userId) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (forumPostRepository.countByAuthorId(userId) >= 5) {
            awardIfMissing(user, BadgeCatalogService.FORUM_WRITER_5);
        }
    }

    public List<BadgeResponse> getMyBadges() {
        return getUserBadges(getCurrentUser().getId());
    }

    public List<BadgeResponse> getUserBadges(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found");
        }
        return userBadgeRepository.findByUserIdOrderByEarnedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<BadgeResponse> getMyUnseenBadges() {
        return userBadgeRepository.findByUserIdAndSeenFalseOrderByEarnedAtAsc(getCurrentUser().getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void acknowledgeBadge(Long userBadgeId) {
        User currentUser = getCurrentUser();
        UserBadge userBadge = userBadgeRepository.findById(userBadgeId)
                .orElseThrow(() -> new RuntimeException("Badge not found"));
        if (!userBadge.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Unauthorized to modify this badge");
        }
        userBadge.setSeen(true);
        userBadgeRepository.save(userBadge);
    }

    private void awardIfMissing(User user, String code) {
        Badge badge = badgeRepository.findByCode(code)
                .orElseThrow(() -> new IllegalStateException("Badge catalog is not initialized: " + code));
        if (userBadgeRepository.existsByUserAndBadge(user, badge)) {
            return;
        }

        userBadgeRepository.save(UserBadge.builder()
                .user(user)
                .badge(badge)
                .seen(false)
                .build());
        notificationService.createSystemNotification(
                user,
                "BADGE_UNLOCKED",
                "Bạn vừa mở khóa huy hiệu \"" + badge.getName() + "\"!"
        );
    }

    private BadgeResponse toResponse(UserBadge userBadge) {
        Badge badge = userBadge.getBadge();
        return BadgeResponse.builder()
                .userBadgeId(userBadge.getId())
                .badgeId(badge.getId())
                .code(badge.getCode())
                .name(badge.getName())
                .description(badge.getDescription())
                .icon(badge.getIcon())
                .earnedAt(userBadge.getEarnedAt())
                .seen(userBadge.getSeen())
                .build();
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new RuntimeException("User not authenticated");
        }
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }
}
