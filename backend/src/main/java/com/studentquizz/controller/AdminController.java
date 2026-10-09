package com.studentquizz.controller;

import com.studentquizz.model.ForumPost;
import com.studentquizz.model.Quiz;
import com.studentquizz.model.User;
import com.studentquizz.repository.ForumCommentRepository;
import com.studentquizz.repository.ForumPostRepository;
import com.studentquizz.repository.QuizCommentRepository;
import com.studentquizz.repository.QuizRepository;
import com.studentquizz.repository.NotificationRepository;
import com.studentquizz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminController {

    private final UserRepository userRepository;
    private final QuizRepository quizRepository;
    private final ForumPostRepository forumPostRepository;
    private final ForumCommentRepository forumCommentRepository;
    private final com.studentquizz.repository.ForumPostLikeRepository forumPostLikeRepository;
    private final QuizCommentRepository quizCommentRepository;
    private final NotificationRepository notificationRepository;
    private final com.studentquizz.repository.UserBadgeRepository userBadgeRepository;
    private final com.studentquizz.repository.QuizAttemptRepository quizAttemptRepository;
    private final PasswordEncoder passwordEncoder;

    // ─── Dashboard Stats ──────────────────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        long totalUsers  = userRepository.count();
        long totalQuizzes = quizRepository.count();
        long totalPosts  = forumPostRepository.count();
        long totalPlays  = quizRepository.sumPlayCount();

        return ResponseEntity.ok(Map.of(
                "totalUsers",   totalUsers,
                "totalQuizzes", totalQuizzes,
                "totalPosts",   totalPosts,
                "totalPlays",   totalPlays
        ));
    }

    // ─── User Management ──────────────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<User> result = userRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
        return ResponseEntity.ok(Map.of(
                "content",       result.getContent(),
                "totalPages",    result.getTotalPages(),
                "totalElements", result.getTotalElements(),
                "currentPage",   page
        ));
    }

    @PutMapping("/users/{id}/role")
    @Transactional
    public ResponseEntity<Map<String, String>> updateRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String newRole = body.getOrDefault("role", "USER");
        if (!newRole.equals("USER") && !newRole.equals("ADMIN")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role"));
        }
        user.setRole(newRole);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Role updated to " + newRole));
    }

    @PutMapping("/users/{id}/lock")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateUserLock(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if ("ADMIN".equals(user.getRole())) {
            throw new RuntimeException("Không thể khóa tài khoản quản trị.");
        }

        boolean locked = Boolean.TRUE.equals(body.get("locked"))
                || "true".equalsIgnoreCase(String.valueOf(body.get("locked")));
        user.setLocked(locked);
        if (locked) {
            String reason = body.get("lockReason") != null ? String.valueOf(body.get("lockReason")).trim() : "";
            if (reason.isEmpty()) {
                throw new RuntimeException("Vui lòng nhập lý do khóa tài khoản.");
            }
            user.setLockReason(reason);
        } else {
            user.setLockReason(null);
        }
        userRepository.save(user);
        return ResponseEntity.ok(Map.of(
                "message", locked ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản",
                "locked", locked,
                "lockReason", user.getLockReason() != null ? user.getLockReason() : ""
        ));
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        // 1. Delete likes, comments, and notifications written by/received by the user
        forumPostLikeRepository.deleteByUserId(id);
        forumCommentRepository.deleteByAuthorId(id);
        quizCommentRepository.deleteByAuthorId(id);
        notificationRepository.deleteByRecipientId(id);
        notificationRepository.deleteByActorId(id);
        userBadgeRepository.deleteByUserId(id);
        quizAttemptRepository.deleteAll(quizAttemptRepository.findByUserIdOrderByCompletedAtDesc(id));

        // 2. Find and delete all posts by the user (and comments on those posts)
        java.util.List<ForumPost> posts = forumPostRepository.findByAuthorIdOrderByCreatedAtDesc(id);
        for (ForumPost post : posts) {
            forumCommentRepository.deleteByPostId(post.getId());
            forumPostLikeRepository.deleteByPostId(post.getId());
            notificationRepository.deleteByPostId(post.getId());
            forumPostRepository.delete(post);
        }

        // 3. Find and delete all quizzes by the user
        java.util.List<Quiz> quizzes = quizRepository.findByAuthorIdOrderByCreatedAtDesc(id);
        for (Quiz quiz : quizzes) {
            quizAttemptRepository.deleteAll(quizAttemptRepository.findByQuizId(quiz.getId()));
            quizCommentRepository.deleteByQuizId(quiz.getId());
            notificationRepository.deleteByQuizId(quiz.getId());
            quizRepository.delete(quiz);
        }

        // 4. Finally, delete the user
        userRepository.deleteById(id);

        return ResponseEntity.ok(Map.of("message", "User and all related data deleted"));
    }

    // ─── Quiz Management ─────────────────────────────────────────────────────

    @GetMapping("/quizzes")
    public ResponseEntity<Map<String, Object>> getQuizzes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<Quiz> result = quizRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
        
        java.util.List<com.studentquizz.dto.QuizDto> dtos = result.getContent().stream()
                .map(quiz -> com.studentquizz.dto.QuizDto.builder()
                        .id(quiz.getId())
                        .title(quiz.getTitle())
                        .category(quiz.getCategory())
                        .description(quiz.getDescription())
                        .questionCount(quiz.getQuestionCount())
                        .playCount(quiz.getPlayCount())
                        .featured(quiz.getFeatured())
                        .status(quiz.getStatus())
                        .rejectReason(quiz.getRejectReason())
                        .appealMessage(quiz.getAppealMessage())
                        .author(quiz.getAuthor() != null ? com.studentquizz.dto.AuthorDto.builder().id(quiz.getAuthor().getId()).name(quiz.getAuthor().getName()).build() : null)
                        .build())
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "content",       dtos,
                "totalPages",    result.getTotalPages(),
                "totalElements", result.getTotalElements(),
                "currentPage",   page
        ));
    }

    @DeleteMapping("/quizzes/{id}")
    @Transactional
    public ResponseEntity<Map<String, String>> deleteQuiz(@PathVariable Long id) {
        if (!quizRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        quizCommentRepository.deleteByQuizId(id);
        notificationRepository.deleteByQuizId(id);
        quizRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Quiz deleted"));
    }

    @PutMapping("/quizzes/{id}/featured")
    @Transactional
    public ResponseEntity<Map<String, Object>> toggleFeatured(@PathVariable Long id) {
        Quiz quiz = quizRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quiz not found"));
        quiz.setFeatured(!Boolean.TRUE.equals(quiz.getFeatured()));
        quizRepository.save(quiz);
        return ResponseEntity.ok(Map.of(
                "message", quiz.getFeatured() ? "Quiz đã được đưa lên nổi bật" : "Quiz đã bỏ nổi bật",
                "featured", quiz.getFeatured()
        ));
    }

    // ─── Forum Management ────────────────────────────────────────────────────

    @GetMapping("/forum/posts")
    public ResponseEntity<Map<String, Object>> getPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<ForumPost> result = forumPostRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
        
        java.util.List<com.studentquizz.dto.ForumDto.PostResponse> dtos = result.getContent().stream()
                .map(post -> com.studentquizz.dto.ForumDto.PostResponse.builder()
                        .id(post.getId())
                        .title(post.getTitle())
                        .content(post.getContent())
                        .likeCount(post.getLikeCount())
                        .commentCount(post.getCommentCount())
                        .tags(post.getTags() != null ? new java.util.ArrayList<>(post.getTags()) : new java.util.ArrayList<>())
                        .createdAt(post.getCreatedAt())
                        .status(post.getStatus())
                        .rejectReason(post.getRejectReason())
                        .appealMessage(post.getAppealMessage())
                        .attachmentUrl(post.getAttachmentUrl())
                        .attachmentName(post.getAttachmentName())
                        .attachmentType(post.getAttachmentType())
                        .attachments(post.getAttachments() == null
                                ? new java.util.ArrayList<>()
                                : post.getAttachments().stream()
                                        .map(attachment -> com.studentquizz.dto.ForumDto.AttachmentResponse.builder()
                                                .id(attachment.getId())
                                                .url(attachment.getUrl())
                                                .name(attachment.getName())
                                                .type(attachment.getType())
                                                .build())
                                        .collect(java.util.stream.Collectors.toList()))
                        .linkUrl(post.getLinkUrl())
                        .author(post.getAuthor() != null ? com.studentquizz.dto.AuthorDto.builder().id(post.getAuthor().getId()).name(post.getAuthor().getName()).build() : null)
                        .build())
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "content",       dtos,
                "totalPages",    result.getTotalPages(),
                "totalElements", result.getTotalElements(),
                "currentPage",   page
        ));
    }

    @DeleteMapping("/forum/posts/{id}")
    @Transactional
    public ResponseEntity<Map<String, String>> deletePost(@PathVariable Long id) {
        if (!forumPostRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        forumCommentRepository.deleteByPostId(id);
        forumPostLikeRepository.deleteByPostId(id);
        notificationRepository.deleteByPostId(id);
        forumPostRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Post deleted"));
    }

    @PutMapping("/quizzes/{id}/status")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateQuizStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Quiz quiz = quizRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quiz not found"));
        String newStatus = body.getOrDefault("status", "PENDING");
        if ("REJECTED".equals(newStatus)) {
            String reason = body.get("rejectReason");
            if (reason == null || reason.trim().isEmpty()) {
                throw new RuntimeException("Vui lòng nhập lý do từ chối.");
            }
            quiz.setRejectReason(reason.trim());
            quiz.setAppealMessage(null);
        } else if ("APPROVED".equals(newStatus)) {
            quiz.setRejectReason(null);
            quiz.setAppealMessage(null);
        }
        quiz.setStatus(newStatus);
        quizRepository.save(quiz);
        return ResponseEntity.ok(Map.of(
                "message", "Đã cập nhật trạng thái quiz",
                "status", quiz.getStatus(),
                "rejectReason", quiz.getRejectReason() != null ? quiz.getRejectReason() : "",
                "appealMessage", quiz.getAppealMessage() != null ? quiz.getAppealMessage() : ""
        ));
    }

    @PutMapping("/forum/posts/{id}/status")
    @Transactional
    public ResponseEntity<Map<String, Object>> updatePostStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        ForumPost post = forumPostRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        String newStatus = body.getOrDefault("status", "PENDING");
        if ("REJECTED".equals(newStatus)) {
            String reason = body.get("rejectReason");
            if (reason == null || reason.trim().isEmpty()) {
                throw new RuntimeException("Vui lòng nhập lý do từ chối.");
            }
            post.setRejectReason(reason.trim());
            post.setAppealMessage(null);
        } else if ("APPROVED".equals(newStatus)) {
            post.setRejectReason(null);
            post.setAppealMessage(null);
        }
        post.setStatus(newStatus);
        forumPostRepository.save(post);
        return ResponseEntity.ok(Map.of(
                "message", "Đã cập nhật trạng thái bài viết",
                "status", post.getStatus(),
                "rejectReason", post.getRejectReason() != null ? post.getRejectReason() : "",
                "appealMessage", post.getAppealMessage() != null ? post.getAppealMessage() : ""
        ));
    }
}
