package com.studentquizz.repository;

import com.studentquizz.model.Badge;
import com.studentquizz.model.User;
import com.studentquizz.model.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;

public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
    boolean existsByUserAndBadge(User user, Badge badge);
    List<UserBadge> findByUserIdOrderByEarnedAtDesc(Long userId);
    List<UserBadge> findByUserIdAndSeenFalseOrderByEarnedAtAsc(Long userId);

    @Modifying
    void deleteByUserId(Long userId);
}
