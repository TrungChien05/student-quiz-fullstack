package com.studentquizz.controller;

import com.studentquizz.dto.AuthDto;
import com.studentquizz.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @GetMapping("/version")
    public ResponseEntity<java.util.Map<String, String>> getVersion() {
        return ResponseEntity.ok(java.util.Map.of(
                "version", "v1.2-tags-and-options-fix",
                "info", "Updated lazy initialization for tags, question options, and comment replies"
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDto.AuthResponse> login(@Valid @RequestBody AuthDto.LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDto.AuthResponse> register(@Valid @RequestBody AuthDto.RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    /** Endpoint riêng cho Admin - chỉ cho phép tài khoản có role ADMIN */
    @PostMapping("/admin-login")
    public ResponseEntity<AuthDto.AuthResponse> adminLogin(@Valid @RequestBody AuthDto.LoginRequest request) {
        return ResponseEntity.ok(authService.adminLogin(request));
    }
}

