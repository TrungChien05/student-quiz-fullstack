package com.studentquizz.repository;

import com.studentquizz.model.ForumPost;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ForumPostRepository extends JpaRepository<ForumPost, Long> {
    List<ForumPost> findByStatusOrderByCreatedAtDesc(String status);
    List<ForumPost> findByTagsContainingAndStatusOrderByCreatedAtDesc(String tag, String status);
    List<ForumPost> findByAuthorIdOrderByCreatedAtDesc(Long authorId);
    List<ForumPost> findByAuthorIdAndStatusOrderByCreatedAtDesc(Long authorId, String status);
    long countByAuthorId(Long authorId);

}
