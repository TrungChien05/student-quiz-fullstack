package com.studentquizz.repository;

import com.studentquizz.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m JOIN FETCH m.sender JOIN FETCH m.recipient WHERE " +
           "(m.sender.id = :user1Id AND m.recipient.id = :user2Id) OR " +
           "(m.sender.id = :user2Id AND m.recipient.id = :user1Id) " +
           "ORDER BY m.createdAt ASC")
    List<ChatMessage> findChatHistory(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    @Query("SELECT m FROM ChatMessage m WHERE m.recipient.id = :userId AND m.sender.id = :friendId AND m.isRead = false")
    List<ChatMessage> findUnreadMessages(@Param("userId") Long userId, @Param("friendId") Long friendId);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.recipient.id = :userId AND m.isRead = false")
    long countTotalUnreadMessages(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.recipient.id = :userId AND m.sender.id = :friendId AND m.isRead = false")
    void markAsRead(@Param("userId") Long userId, @Param("friendId") Long friendId);

    @Query(value = "SELECT * FROM chat_messages m WHERE " +
           "((m.sender_id = :userId AND m.recipient_id = :friendId) OR " +
           "(m.sender_id = :friendId AND m.recipient_id = :userId)) " +
           "ORDER BY m.created_at DESC LIMIT 1", nativeQuery = true)
    ChatMessage findLastMessageBetween(@Param("userId") Long userId, @Param("friendId") Long friendId);
}
