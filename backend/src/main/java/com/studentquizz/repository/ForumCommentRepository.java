package com.studentquizz.repository;

import com.studentquizz.model.ForumComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ForumCommentRepository extends JpaRepository<ForumComment, Long> {
    List<ForumComment> findByPostIdOrderByCreatedAtAsc(Long postId);

    @Modifying
    @Query("DELETE FROM ForumComment c WHERE c.author.id = :userId")
    void deleteByAuthorId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM ForumComment c WHERE c.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);
}
