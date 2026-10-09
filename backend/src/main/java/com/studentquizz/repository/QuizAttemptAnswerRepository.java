package com.studentquizz.repository;

import com.studentquizz.model.QuizAttemptAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QuizAttemptAnswerRepository extends JpaRepository<QuizAttemptAnswer, Long> {
    @Query("""
            select answer from QuizAttemptAnswer answer
            join fetch answer.attempt attempt
            join fetch attempt.quiz quiz
            where attempt.user.id = :userId and answer.correct = false
            order by attempt.completedAt desc
            """)
    List<QuizAttemptAnswer> findRecentWrongAnswers(@Param("userId") Long userId);
}
