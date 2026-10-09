package com.studentquizz.service;

import com.studentquizz.dto.BadgeResponse;
import com.studentquizz.model.ForumPost;
import com.studentquizz.model.Quiz;
import com.studentquizz.model.QuizAttempt;
import com.studentquizz.model.User;
import com.studentquizz.repository.ForumPostRepository;
import com.studentquizz.repository.NotificationRepository;
import com.studentquizz.repository.QuizAttemptRepository;
import com.studentquizz.repository.QuizRepository;
import com.studentquizz.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class AchievementServiceTests {
    @Autowired private AchievementService achievementService;
    @Autowired private UserRepository userRepository;
    @Autowired private QuizRepository quizRepository;
    @Autowired private QuizAttemptRepository quizAttemptRepository;
    @Autowired private ForumPostRepository forumPostRepository;
    @Autowired private NotificationRepository notificationRepository;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void updatesStreakAwardsBadgesCreatesNotificationsAndAcknowledgesPopup() {
        long suffix = System.nanoTime();
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        User user = userRepository.save(User.builder()
                .name("Achievement User")
                .email("achievement-" + suffix + "@test.local")
                .password("password")
                .role("USER")
                .locked(false)
                .currentStreak(6)
                .longestStreak(6)
                .lastActivityDate(today.minusDays(1))
                .build());
        Quiz quiz = quizRepository.save(Quiz.builder()
                .title("Perfect Quiz " + suffix)
                .category("Test")
                .questionCount(10)
                .playCount(0L)
                .featured(false)
                .author(user)
                .status("APPROVED")
                .build());
        QuizAttempt attempt = quizAttemptRepository.save(QuizAttempt.builder()
                .user(user)
                .quiz(quiz)
                .score(10)
                .totalQuestions(10)
                .build());

        achievementService.recordQuizActivity(user.getId(), attempt);
        authenticate(user);

        User updated = userRepository.findById(user.getId()).orElseThrow();
        assertEquals(7, updated.getCurrentStreak());
        assertEquals(7, updated.getLongestStreak());
        assertEquals(today, updated.getLastActivityDate());

        List<BadgeResponse> firstAwards = achievementService.getMyUnseenBadges();
        Set<String> codes = firstAwards.stream().map(BadgeResponse::getCode).collect(Collectors.toSet());
        assertEquals(Set.of(BadgeCatalogService.ROOKIE, BadgeCatalogService.STREAK_7, BadgeCatalogService.PERFECT_10), codes);
        assertEquals(3, notificationRepository.countByRecipientIdAndIsReadFalse(user.getId()));

        achievementService.recordQuizActivity(user.getId(), attempt);
        assertEquals(3, achievementService.getMyBadges().size(), "Repeated evaluation must not award duplicates");
        assertEquals(7, userRepository.findById(user.getId()).orElseThrow().getCurrentStreak(),
                "A second quiz on the same day must not increase the streak");

        achievementService.acknowledgeBadge(firstAwards.get(0).getUserBadgeId());
        assertEquals(2, achievementService.getMyUnseenBadges().size());

        for (int index = 0; index < 5; index++) {
            forumPostRepository.save(ForumPost.builder()
                    .title("Post " + index)
                    .content("Achievement test post")
                    .author(user)
                    .tags(List.of("test"))
                    .status("APPROVED")
                    .build());
        }
        achievementService.evaluateForumBadges(user.getId());
        assertTrue(achievementService.getMyBadges().stream()
                .anyMatch(badge -> BadgeCatalogService.FORUM_WRITER_5.equals(badge.getCode())));
    }

    private void authenticate(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        user.getEmail(),
                        "password",
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))));
    }
}
