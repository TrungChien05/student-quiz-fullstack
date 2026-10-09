package com.studentquizz.service;

import com.studentquizz.dto.AuthorDto;
import com.studentquizz.dto.QuizDto;
import com.studentquizz.dto.UserProfileResponse;
import com.studentquizz.dto.UpdateProfileRequest;
import com.studentquizz.model.Quiz;
import com.studentquizz.model.User;
import com.studentquizz.repository.ForumPostRepository;
import com.studentquizz.repository.QuizRepository;
import com.studentquizz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final QuizRepository quizRepository;
    private final ForumPostRepository forumPostRepository;
    private final PasswordEncoder passwordEncoder;

    public UserProfileResponse getMyProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Quiz> quizzes = quizRepository.findByAuthorIdOrderByCreatedAtDesc(user.getId());
        List<com.studentquizz.model.ForumPost> posts = forumPostRepository.findByAuthorIdOrderByCreatedAtDesc(user.getId());

        List<QuizDto> quizDtos = quizzes.stream().map(this::toQuizDto).collect(Collectors.toList());
        List<com.studentquizz.dto.ForumDto.PostResponse> postDtos = posts.stream().map(this::toPostDto).collect(Collectors.toList());

        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .gender(user.getGender())
                .interests(user.getInterests())
                .bio(user.getBio())
                .profileCompleted(isProfileCompleted(user))
                .currentStreak(user.getCurrentStreak())
                .longestStreak(user.getLongestStreak())
                .lastActivityDate(user.getLastActivityDate())
                .totalQuizzes(quizDtos.size())
                .totalPosts(postDtos.size())
                .quizzes(quizDtos)
                .posts(postDtos)
                .build();
    }

    private QuizDto toQuizDto(Quiz quiz) {
        AuthorDto authorDto = quiz.getAuthor() != null 
                ? AuthorDto.builder().id(quiz.getAuthor().getId()).name(quiz.getAuthor().getName()).build() 
                : AuthorDto.builder().id(0L).name("Unknown").build();
        return QuizDto.builder()
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
                // Không map questions ở danh sách để tối ưu
                .author(authorDto)
                .build();
    }

    private com.studentquizz.dto.ForumDto.PostResponse toPostDto(com.studentquizz.model.ForumPost post) {
        AuthorDto authorDto = post.getAuthor() != null 
                ? AuthorDto.builder().id(post.getAuthor().getId()).name(post.getAuthor().getName()).build() 
                : AuthorDto.builder().id(0L).name("Unknown").build();
        return com.studentquizz.dto.ForumDto.PostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .author(authorDto)
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .tags(post.getTags() != null ? new java.util.ArrayList<>(post.getTags()) : new java.util.ArrayList<>())
                .createdAt(post.getCreatedAt())
                .status(post.getStatus())
                .rejectReason(post.getRejectReason())
                .appealMessage(post.getAppealMessage())
                .build();
    }

    public UserProfileResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentEmail).orElse(null);

        boolean isSelfOrAdmin = currentUser != null && (currentUser.getId().equals(userId) || "ADMIN".equals(currentUser.getRole()));

        List<Quiz> quizzes;
        List<com.studentquizz.model.ForumPost> posts;

        if (isSelfOrAdmin) {
            quizzes = quizRepository.findByAuthorIdOrderByCreatedAtDesc(userId);
            posts = forumPostRepository.findByAuthorIdOrderByCreatedAtDesc(userId);
        } else {
            quizzes = quizRepository.findByAuthorIdAndStatusOrderByCreatedAtDesc(userId, "APPROVED");
            posts = forumPostRepository.findByAuthorIdAndStatusOrderByCreatedAtDesc(userId, "APPROVED");
        }

        List<QuizDto> quizDtos = quizzes.stream().map(this::toQuizDto).collect(Collectors.toList());
        List<com.studentquizz.dto.ForumDto.PostResponse> postDtos = posts.stream().map(this::toPostDto).collect(Collectors.toList());

        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .gender(user.getGender())
                .interests(user.getInterests())
                .bio(user.getBio())
                .profileCompleted(isProfileCompleted(user))
                .currentStreak(user.getCurrentStreak())
                .longestStreak(user.getLongestStreak())
                .lastActivityDate(user.getLastActivityDate())
                .totalQuizzes(quizDtos.size())
                .totalPosts(postDtos.size())
                .quizzes(quizDtos)
                .posts(postDtos)
                .build();
    }

    @org.springframework.transaction.annotation.Transactional
    public UserProfileResponse updateProfile(UpdateProfileRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getName() != null && !request.getName().isBlank()) {
            String name = request.getName().trim();
            if (name.length() > 100) {
                throw new IllegalArgumentException("Tên hiển thị không được vượt quá 100 ký tự");
            }
            user.setName(name);
        }
        if (request.getAvatar() != null) {
            user.setAvatar(request.getAvatar());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            if (request.getPassword().length() < 6) {
                throw new RuntimeException("Mật khẩu mới phải từ 6 ký tự trở lên");
            }
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getGender() != null) {
            String gender = request.getGender().trim().toUpperCase();
            Set<String> allowedGenders = Set.of("MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY");
            if (!gender.isEmpty() && !allowedGenders.contains(gender)) {
                throw new IllegalArgumentException("Giới tính không hợp lệ");
            }
            user.setGender(gender.isEmpty() ? null : gender);
        }
        if (request.getInterests() != null) {
            String interests = request.getInterests().trim();
            if (interests.length() > 300) {
                throw new IllegalArgumentException("Sở thích không được vượt quá 300 ký tự");
            }
            user.setInterests(interests.isEmpty() ? null : interests);
        }
        if (request.getBio() != null) {
            String bio = request.getBio().trim();
            if (bio.length() > 500) {
                throw new IllegalArgumentException("Giới thiệu bản thân không được vượt quá 500 ký tự");
            }
            user.setBio(bio.isEmpty() ? null : bio);
        }

        userRepository.save(user);
        return getMyProfile();
    }

    private boolean isProfileCompleted(User user) {
        return user.getGender() != null && !user.getGender().isBlank()
                && user.getInterests() != null && !user.getInterests().isBlank()
                && user.getBio() != null && !user.getBio().isBlank();
    }
}
