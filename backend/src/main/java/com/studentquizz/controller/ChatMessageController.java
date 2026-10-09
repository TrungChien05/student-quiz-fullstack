package com.studentquizz.controller;

import com.studentquizz.dto.ChatDto;
import com.studentquizz.service.ChatMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class ChatMessageController {

    private final ChatMessageService chatMessageService;

    @PostMapping
    public ResponseEntity<ChatDto.MessageResponse> sendMessage(@RequestBody ChatDto.MessageRequest request) {
        return ResponseEntity.ok(chatMessageService.sendMessage(request));
    }

    @GetMapping("/{friendId}")
    public ResponseEntity<List<ChatDto.MessageResponse>> getChatHistory(@PathVariable Long friendId) {
        return ResponseEntity.ok(chatMessageService.getChatHistory(friendId));
    }

    @GetMapping("/conversations")
    public ResponseEntity<List<ChatDto.ConversationResponse>> getConversations() {
        return ResponseEntity.ok(chatMessageService.getConversationsList());
    }

    @PostMapping("/read/{friendId}")
    public ResponseEntity<Map<String, String>> markAsRead(@PathVariable Long friendId) {
        chatMessageService.markAsRead(friendId);
        return ResponseEntity.ok(Map.of("message", "Đã đọc tin nhắn."));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        long count = chatMessageService.getTotalUnreadCount();
        return ResponseEntity.ok(Map.of("count", count));
    }
}
