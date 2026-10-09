package com.studentquizz.repository;

import com.studentquizz.dto.LeaderboardDto;
import com.studentquizz.model.QuizAttempt;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"quiz"})
    List<QuizAttempt> findByUserIdOrderByCompletedAtDesc(Long userId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"quiz"})
    List<QuizAttempt> findTop20ByUserIdOrderByCompletedAtDesc(Long userId);

    List<QuizAttempt> findByQuizId(Long quizId);

    List<QuizAttempt> findByUserIdAndQuizIdIn(Long userId, List<Long> quizIds);

    long countByUserId(Long userId);

    @Query("SELECT new com.studentquizz.dto.LeaderboardDto(u.id, u.name, u.avatar, COUNT(qa)) " +
           "FROM QuizAttempt qa JOIN qa.user u " +
           "GROUP BY u.id, u.name, u.avatar " +
           "ORDER BY COUNT(qa) DESC")
    List<LeaderboardDto> getMostActiveUsers(Pageable pageable);

    @Query("SELECT new com.studentquizz.dto.LeaderboardDto(u.id, u.name, u.avatar, SUM(qa.score)) " +
           "FROM QuizAttempt qa JOIN qa.user u " +
           "GROUP BY u.id, u.name, u.avatar " +
           "ORDER BY SUM(qa.score) DESC")
    List<LeaderboardDto> getTopScoringUsers(Pageable pageable);
}
