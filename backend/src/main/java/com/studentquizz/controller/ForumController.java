package com.studentquizz.controller;

import com.studentquizz.dto.ForumDto;
import com.studentquizz.service.CloudinaryService;
import com.studentquizz.service.ForumService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/forum")
@RequiredArgsConstructor
public class ForumController {

    private final ForumService forumService;
    private final CloudinaryService cloudinaryService;

    @GetMapping("/posts")
    public ResponseEntity<List<ForumDto.PostResponse>> getPosts() {
        return ResponseEntity.ok(forumService.getAllPosts());
    }

    @GetMapping("/posts/{id}")
    public ResponseEntity<ForumDto.PostResponse> getPost(@PathVariable Long id) {
        return ResponseEntity.ok(forumService.getPostById(id));
    }

    @PostMapping("/posts")
    public ResponseEntity<ForumDto.PostResponse> createPost(@RequestBody ForumDto.CreatePostRequest req) {
        return ResponseEntity.ok(forumService.createPost(req));
    }

    @PostMapping("/posts/{id}/like")
    public ResponseEntity<ForumDto.LikeResponse> toggleLike(@PathVariable Long id) {
        return ResponseEntity.ok(forumService.toggleLike(id));
    }

    @GetMapping("/posts/{id}/comments")
    public ResponseEntity<List<ForumDto.CommentResponse>> getComments(@PathVariable Long id) {
        return ResponseEntity.ok(forumService.getComments(id));
    }

    @PostMapping("/posts/{id}/comments")
    public ResponseEntity<ForumDto.CommentResponse> addComment(
            @PathVariable Long id,
            @RequestBody ForumDto.CreateCommentRequest req) {
        return ResponseEntity.ok(forumService.addComment(id, req));
    }

    @PutMapping("/posts/{id}/appeal")
    public ResponseEntity<ForumDto.PostResponse> appeal(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String message = body.getOrDefault("appealMessage", "Tôi muốn khiếu nại.");
        return ResponseEntity.ok(forumService.appeal(id, message));
    }

    /**
     * Upload file/ảnh lên Cloudinary.
     * Dùng cho: đính kèm bài viết diễn đàn + đổi avatar người dùng.
     * Trả về { url, name, type } — cấu trúc giữ nguyên so với phiên bản cũ.
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tệp tin không được để trống."));
        }
        try {
            Map<String, String> result = cloudinaryService.upload(file);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Lỗi khi tải lên Cloudinary: " + e.getMessage()));
        }
    }
}

