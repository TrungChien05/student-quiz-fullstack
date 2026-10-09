package com.studentquizz.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String name;
    private String email;
    private String avatar;
    private String gender;
    private String interests;
    private String bio;
    private boolean profileCompleted;
    private Integer currentStreak;
    private Integer longestStreak;
    private LocalDate lastActivityDate;
    private int totalQuizzes;
    private int totalPosts;
    private List<QuizDto> quizzes;
    private List<ForumDto.PostResponse> posts;
}
