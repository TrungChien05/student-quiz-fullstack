package com.studentquizz.service;

import com.studentquizz.dto.AuthorDto;
import com.studentquizz.dto.ChatDto;
import com.studentquizz.model.ChatMessage;
import com.studentquizz.model.User;
import com.studentquizz.repository.ChatMessageRepository;
import com.studentquizz.repository.FriendshipRepository;
import com.studentquizz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatMessageService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final FriendshipService friendshipService;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not authenticated"));
    }

    @Transactional
    public ChatDto.MessageResponse sendMessage(ChatDto.MessageRequest request) {
        User sender = getCurrentUser();
        
        if (request.getRecipientId() == null) {
            throw new RuntimeException("Thiếu thông tin người nhận.");
        }
        if (request.getContent() == null || request.getContent().isBlank()) {
            throw new RuntimeException("Nội dung tin nhắn không được để trống.");
        }
        
        User recipient = userRepository.findById(request.getRecipientId())
                .orElseThrow(() -> new RuntimeException("Người nhận không tồn tại."));

        // Kiểm tra trạng thái kết bạn trong một transaction
        String status = friendshipService.getFriendshipStatus(request.getRecipientId());
        if (!"ACCEPTED".equals(status)) {
            throw new RuntimeException("Bạn chỉ có thể nhắn tin cho những người đã kết bạn với bạn.");
        }

        ChatMessage message = ChatMessage.builder()
                .sender(sender)
                .recipient(recipient)
                .content(request.getContent().trim())
                .isRead(false)
                .build();

        message = chatMessageRepository.save(message);
        return toResponse(message);
    }

    @Transactional(readOnly = true)
    public List<ChatDto.MessageResponse> getChatHistory(Long friendId) {
        User user = getCurrentUser();
        return chatMessageRepository.findChatHistory(user.getId(), friendId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(Long friendId) {
        User user = getCurrentUser();
        chatMessageRepository.markAsRead(user.getId(), friendId);
    }

    @Transactional(readOnly = true)
    public List<ChatDto.ConversationResponse> getConversationsList() {
        User user = getCurrentUser();
        List<AuthorDto> friends = friendshipService.getFriendsList();
        List<ChatDto.ConversationResponse> list = new ArrayList<>();

        for (AuthorDto friend : friends) {
            try {
                ChatMessage lastMsg = chatMessageRepository.findLastMessageBetween(user.getId(), friend.getId());
                if (lastMsg == null) {
                    continue;
                }

                int unread = chatMessageRepository.findUnreadMessages(user.getId(), friend.getId()).size();

                list.add(ChatDto.ConversationResponse.builder()
                        .friend(friend)
                        .lastMessage(lastMsg.getContent())
                        .lastMessageSenderId(lastMsg.getSender().getId())
                        .lastMessageTime(lastMsg.getCreatedAt())
                        .unreadCount(unread)
                        .build());
            } catch (Exception e) {
                log.warn("Không thể tải hội thoại với bạn bè id={}: {}", friend.getId(), e.getMessage());
            }
        }

        list.sort((c1, c2) -> c2.getLastMessageTime().compareTo(c1.getLastMessageTime()));
        return list;
    }

    @Transactional(readOnly = true)
    public long getTotalUnreadCount() {
        User user = getCurrentUser();
        return chatMessageRepository.countTotalUnreadMessages(user.getId());
    }

    private ChatDto.MessageResponse toResponse(ChatMessage m) {
        return ChatDto.MessageResponse.builder()
                .id(m.getId())
                .senderId(m.getSender().getId())
                .recipientId(m.getRecipient().getId())
                .content(m.getContent())
                .createdAt(m.getCreatedAt())
                .isRead(m.getIsRead())
                .build();
    }
}
