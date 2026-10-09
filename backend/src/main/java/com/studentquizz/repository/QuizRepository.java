package com.studentquizz.repository;

import com.studentquizz.model.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

import org.springframework.data.repository.query.Param;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
    boolean existsByTitle(String title);

    List<Quiz> findByFeaturedTrueAndStatusOrderByPlayCountDesc(String status);
    
    Page<Quiz> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    
    Page<Quiz> findByCategoryAndStatusOrderByCreatedAtDesc(String category, String status, Pageable pageable);
    
    @Query("SELECT q FROM Quiz q WHERE q.status = :status AND (LOWER(q.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(q.category) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Quiz> searchPublicQuizzes(@Param("keyword") String keyword, @Param("status") String status);
    
    List<Quiz> findByAuthorIdOrderByCreatedAtDesc(Long authorId);
    List<Quiz> findByAuthorIdAndStatusOrderByCreatedAtDesc(Long authorId, String status);

    @Query("SELECT COALESCE(SUM(q.playCount), 0) FROM Quiz q")
    long sumPlayCount();
}

