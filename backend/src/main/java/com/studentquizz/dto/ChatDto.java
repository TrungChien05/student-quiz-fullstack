package com.studentquizz.dto;

import lombok.*;
import java.time.LocalDateTime;

public class ChatDto {

    @Data @Builder @AllArgsConstructor @NoArgsConstructor
    public static class MessageRequest {
        private Long recipientId;
        private String content;
    }

    @Data @Builder @AllArgsConstructor @NoArgsConstructor
    public static class MessageResponse {
        private Long id;
        private Long senderId;
        private Long recipientId;
        private String content;
        private LocalDateTime createdAt;
        private Boolean isRead;
    }

    @Data @Builder @AllArgsConstructor @NoArgsConstructor
    public static class ConversationResponse {
        private AuthorDto friend;
        private String lastMessage;
        private Long lastMessageSenderId;
        private LocalDateTime lastMessageTime;
        private Integer unreadCount;
    }
}
