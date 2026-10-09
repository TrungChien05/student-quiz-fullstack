package com.studentquizz.service;

import com.studentquizz.dto.AuthDto;
import com.studentquizz.model.User;
import com.studentquizz.repository.UserRepository;
import com.studentquizz.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        if (Boolean.TRUE.equals(user.getLocked())) {
            String reason = user.getLockReason();
            if (reason != null && !reason.isBlank()) {
                throw new RuntimeException("Tài khoản đã bị khóa. Lý do: " + reason);
            }
            throw new RuntimeException("Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return buildAuthResponse(token, user);
    }

    public AuthDto.AuthResponse adminLogin(AuthDto.LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        if (!"ADMIN".equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Not an admin account");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return buildAuthResponse(token, user);
    }

    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("USER")
                .build();

        user = userRepository.save(user);
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return buildAuthResponse(token, user);
    }

    private AuthDto.AuthResponse buildAuthResponse(String token, User user) {
        return AuthDto.AuthResponse.builder()
                .token(token)
                .user(AuthDto.UserDto.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .avatar(user.getAvatar())
                        .role(user.getRole())
                        .currentStreak(user.getCurrentStreak())
                        .longestStreak(user.getLongestStreak())
                        .lastActivityDate(user.getLastActivityDate())
                        .build())
                .build();
    }
}
