package com.studentquizz.controller;

import com.studentquizz.dto.CreateQuizRequest;
import com.studentquizz.dto.QuizDto;
import com.studentquizz.service.QuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quizzes")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    @GetMapping("/featured")
    public ResponseEntity<List<QuizDto>> getFeatured() {
        return ResponseEntity.ok(quizService.getFeatured());
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Page<QuizDto> result = quizService.getAll(page, size);
        return ResponseEntity.ok(Map.of(
                "content", result.getContent(),
                "totalPages", result.getTotalPages(),
                "totalElements", result.getTotalElements(),
                "currentPage", page
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuizDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(quizService.getById(id));
    }

    @PostMapping("/{id}/play")
    public ResponseEntity<QuizDto> recordPlay(@PathVariable Long id) {
        return ResponseEntity.ok(quizService.incrementPlayCount(id));
    }

    /**
     * Create quiz - supports both JSON and multipart (with optional file upload)
     */
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<QuizDto> createWithFile(
            @RequestParam String title,
            @RequestParam String category,
            @RequestParam(required = false) String description,
            @RequestParam(defaultValue = "10") Integer questionCount,
            @RequestParam(required = false) MultipartFile file,
            @RequestParam(required = false) MultipartFile coverImage) {

        CreateQuizRequest req = CreateQuizRequest.builder()
                .title(title)
                .category(category)
                .description(description)
                .questionCount(questionCount)
                .build();
        return ResponseEntity.ok(quizService.create(req, file, coverImage));
    }

    @PostMapping(consumes = {"application/json"})
    public ResponseEntity<QuizDto> create(@RequestBody CreateQuizRequest req) {
        return ResponseEntity.ok(quizService.create(req, null, null));
    }

    @PutMapping("/{id}/appeal")
    public ResponseEntity<QuizDto> appeal(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String message = body.getOrDefault("appealMessage", "Tôi muốn khiếu nại.");
        return ResponseEntity.ok(quizService.appeal(id, message));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<com.studentquizz.dto.ForumDto.CommentResponse>> getComments(@PathVariable Long id) {
        return ResponseEntity.ok(quizService.getComments(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<com.studentquizz.dto.ForumDto.CommentResponse> addComment(
            @PathVariable Long id,
            @RequestBody com.studentquizz.dto.ForumDto.CreateCommentRequest req) {
        return ResponseEntity.ok(quizService.addComment(id, req));
    }

    @PostMapping("/{id}/attempt")
    public ResponseEntity<com.studentquizz.dto.QuizAttemptResponse> recordAttempt(
            @PathVariable Long id,
            @Valid @RequestBody com.studentquizz.dto.QuizAttemptRequest request) {
        return ResponseEntity.ok(quizService.recordAttempt(id, request));
    }

    @GetMapping("/attempts/my")
    public ResponseEntity<List<com.studentquizz.dto.QuizAttemptResponse>> getMyAttempts() {
        return ResponseEntity.ok(quizService.getMyAttempts());
    }
}
