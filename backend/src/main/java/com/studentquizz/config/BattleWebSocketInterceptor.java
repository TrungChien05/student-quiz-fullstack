package com.studentquizz.config;

import com.studentquizz.model.BattleRoom;
import com.studentquizz.model.User;
import com.studentquizz.repository.BattleParticipantRepository;
import com.studentquizz.repository.BattleRoomRepository;
import com.studentquizz.repository.UserRepository;
import com.studentquizz.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class BattleWebSocketInterceptor implements ChannelInterceptor {
    private static final Pattern BATTLE_TOPIC = Pattern.compile("^/topic/battle/(\\d{6})$");

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final BattleRoomRepository roomRepository;
    private final BattleParticipantRepository participantRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticate(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeSubscription(accessor);
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new AccessDeniedException("Thiếu thông tin đăng nhập WebSocket.");
        }
        String token = header.substring(7);
        if (!jwtUtil.isValid(token)) {
            throw new AccessDeniedException("Phiên đăng nhập WebSocket không hợp lệ.");
        }

        String email = jwtUtil.extractEmail(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AccessDeniedException("Không tìm thấy người dùng."));
        if (Boolean.TRUE.equals(user.getLocked())) {
            throw new AccessDeniedException("Tài khoản đã bị khóa.");
        }
        String role = jwtUtil.extractRole(token);
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                email,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + (role == null ? "USER" : role)))
        ));
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) return;
        Matcher matcher = BATTLE_TOPIC.matcher(destination);
        if (!matcher.matches()) {
            throw new AccessDeniedException("Kênh WebSocket không được phép.");
        }
        if (accessor.getUser() == null) {
            throw new AccessDeniedException("Bạn chưa đăng nhập WebSocket.");
        }

        User user = userRepository.findByEmail(accessor.getUser().getName())
                .orElseThrow(() -> new AccessDeniedException("Không tìm thấy người dùng."));
        BattleRoom room = roomRepository.findByRoomCode(matcher.group(1))
                .orElseThrow(() -> new AccessDeniedException("Phòng đấu không tồn tại."));
        if (participantRepository.findByRoomAndUser(room, user).isEmpty()) {
            throw new AccessDeniedException("Bạn chưa tham gia phòng đấu này.");
        }
    }
}
