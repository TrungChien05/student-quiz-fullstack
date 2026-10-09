package com.studentquizz.controller;

import com.studentquizz.dto.UserProfileResponse;
import com.studentquizz.dto.UpdateProfileRequest;
import com.studentquizz.service.CloudinaryService;
import com.studentquizz.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final CloudinaryService cloudinaryService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile() {
        return ResponseEntity.ok(userService.getMyProfile());
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateProfile(@RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(request));
    }

    /**
     * Upload ảnh avatar lên Cloudinary rồi cập nhật profile ngay.
     * Frontend gọi: POST /api/users/me/avatar  multipart/form-data field "file"
     */
    @PostMapping("/me/avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File không được để trống."));
        }
        try {
            Map<String, String> uploaded = cloudinaryService.upload(file);
            String avatarUrl = uploaded.get("url");
            UpdateProfileRequest req = new UpdateProfileRequest();
            req.setAvatar(avatarUrl);
            UserProfileResponse updated = userService.updateProfile(req);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Lỗi khi tải ảnh lên: " + e.getMessage()));
        }
    }
}
