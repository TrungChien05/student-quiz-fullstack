package com.studentquizz.repository;

import com.studentquizz.model.QuizComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface QuizCommentRepository extends JpaRepository<QuizComment, Long> {
    List<QuizComment> findByQuizIdOrderByCreatedAtAsc(Long quizId);

    @Modifying
    @Query("DELETE FROM QuizComment c WHERE c.author.id = :userId")
    void deleteByAuthorId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM QuizComment c WHERE c.quiz.id = :quizId")
    void deleteByQuizId(@Param("quizId") Long quizId);
}
