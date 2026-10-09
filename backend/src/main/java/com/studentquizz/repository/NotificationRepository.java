package com.studentquizz.repository;

import com.studentquizz.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);
    
    long countByRecipientIdAndIsReadFalse(Long recipientId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.recipient.id = :userId")
    void deleteByRecipientId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.actor.id = :userId")
    void deleteByActorId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.postId = :postId")
    void deleteByPostId(@Param("postId") Long postId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.quizId = :quizId")
    void deleteByQuizId(@Param("quizId") Long quizId);
}
