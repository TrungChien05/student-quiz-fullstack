package com.studentquizz.service;

import com.studentquizz.dto.AuthorDto;
import com.studentquizz.model.Friendship;
import com.studentquizz.model.User;
import com.studentquizz.repository.FriendshipRepository;
import com.studentquizz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not authenticated"));
    }

    @Transactional
    public void sendFriendRequest(Long friendId) {
        User requester = getCurrentUser();
        if (requester.getId().equals(friendId)) {
            throw new RuntimeException("Không thể gửi lời mời kết bạn cho chính mình.");
        }
        User receiver = userRepository.findById(friendId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại."));

        Optional<Friendship> existing = friendshipRepository.findRelation(requester.getId(), friendId);
        if (existing.isPresent()) {
            Friendship f = existing.get();
            if ("ACCEPTED".equals(f.getStatus())) {
                throw new RuntimeException("Hai người đã là bạn bè.");
            } else {
                throw new RuntimeException("Lời mời kết bạn đang ở trạng thái chờ duyệt.");
            }
        }

        Friendship friendship = Friendship.builder()
                .requester(requester)
                .receiver(receiver)
                .status("PENDING")
                .build();
        friendshipRepository.save(friendship);

        notificationService.createNotification(receiver, requester, "FRIEND_REQUEST", null, null,
                requester.getName() + " đã gửi cho bạn lời mời kết bạn.");
    }

    @Transactional
    public void acceptFriendRequest(Long friendId) {
        User receiver = getCurrentUser();
        // friendId là ID của người đã gửi lời mời (requester)
        Friendship friendship = friendshipRepository.findByRequesterIdAndReceiverId(friendId, receiver.getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lời mời kết bạn."));

        if (!"PENDING".equals(friendship.getStatus())) {
            throw new RuntimeException("Lời mời kết bạn đã được xử lý.");
        }

        friendship.setStatus("ACCEPTED");
        friendshipRepository.save(friendship);

        notificationService.createNotification(friendship.getRequester(), receiver, "FRIEND_ACCEPT", null, null,
                receiver.getName() + " đã đồng ý lời mời kết bạn.");
    }

    @Transactional
    public void declineFriendRequest(Long friendId) {
        User user = getCurrentUser();
        // Tìm relation theo cả hai chiều
        Optional<Friendship> relationOpt = friendshipRepository.findRelation(user.getId(), friendId);
        if (relationOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy lời mời kết bạn.");
        }
        Friendship friendship = relationOpt.get();
        if (!"PENDING".equals(friendship.getStatus())) {
            throw new RuntimeException("Không thể từ chối lời mời đã được đồng ý. Hãy dùng 'Hủy kết bạn'.");
        }
        friendshipRepository.delete(friendship);
    }

    @Transactional
    public void removeFriend(Long friendId) {
        User user = getCurrentUser();
        Friendship friendship = friendshipRepository.findRelation(user.getId(), friendId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mối quan hệ bạn bè."));

        if (!"ACCEPTED".equals(friendship.getStatus())) {
            throw new RuntimeException("Hai người chưa là bạn bè.");
        }
        friendshipRepository.delete(friendship);
    }

    @Transactional(readOnly = true)
    public List<AuthorDto> getFriendsList() {
        User user = getCurrentUser();
        List<Friendship> friendships = friendshipRepository.findFriends(user.getId());
        return friendships.stream().map(f -> {
            User friend = f.getRequester().getId().equals(user.getId()) ? f.getReceiver() : f.getRequester();
            return AuthorDto.builder()
                    .id(friend.getId())
                    .name(friend.getName())
                    .avatar(friend.getAvatar())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AuthorDto> getUserFriendsList(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại."));
        List<Friendship> friendships = friendshipRepository.findFriends(userId);
        return friendships.stream().map(f -> {
            User friend = f.getRequester().getId().equals(userId) ? f.getReceiver() : f.getRequester();
            return AuthorDto.builder()
                    .id(friend.getId())
                    .name(friend.getName())
                    .avatar(friend.getAvatar())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AuthorDto> getPendingRequests() {
        User user = getCurrentUser();
        List<Friendship> pending = friendshipRepository.findPendingRequests(user.getId());
        return pending.stream().map(f -> {
            User requester = f.getRequester();
            return AuthorDto.builder()
                    .id(requester.getId())
                    .name(requester.getName())
                    .avatar(requester.getAvatar())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public String getFriendshipStatus(Long friendId) {
        User user = getCurrentUser();
        if (user.getId().equals(friendId)) {
            return "SELF";
        }
        Optional<Friendship> relation = friendshipRepository.findRelation(user.getId(), friendId);
        if (relation.isEmpty()) {
            return "NONE";
        }
        Friendship f = relation.get();
        if ("ACCEPTED".equals(f.getStatus())) {
            return "ACCEPTED";
        }
        // So sánh ID requester để tránh lazy loading issue
        if (f.getRequester().getId().equals(user.getId())) {
            return "PENDING_SENT";
        } else {
            return "PENDING_RECEIVED";
        }
    }
}
