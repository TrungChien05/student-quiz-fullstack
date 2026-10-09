package com.studentquizz.dto;

import com.studentquizz.model.BattleStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.List;

public final class BattleDto {
    private BattleDto() {}

    @Data
    public static class CreateRoomRequest {
        @NotNull
        private Long quizId;
    }

    @Data
    public static class JoinRoomRequest {
        @NotBlank
        @Pattern(regexp = "\\d{6}", message = "Mã PIN phải gồm đúng 6 chữ số")
        private String roomCode;
    }

    @Data
    public static class AnswerRequest {
        @NotNull
        @Min(0)
        private Integer questionIndex;

        @NotNull
        @Min(0)
        @Max(3)
        private Integer answerIndex;

        @Min(0)
        private Long responseTimeMs;
    }

    @Data
    @Builder
    public static class ParticipantResponse {
        private Long id;
        private Long userId;
        private String name;
        private String avatar;
        private Integer score;
        private Boolean isHost;
    }

    @Data
    @Builder
    public static class QuestionResponse {
        private Integer index;
        private Integer totalQuestions;
        private String content;
        private List<String> options;
        private Instant startedAt;
        private Instant deadline;
    }

    @Data
    @Builder
    public static class RoomResponse {
        private Long id;
        private String roomCode;
        private Long quizId;
        private String quizTitle;
        private Long hostUserId;
        private BattleStatus status;
        private Integer currentQuestionIndex;
        private Integer totalQuestions;
        private LocalDateTime createdAt;
        private QuestionResponse currentQuestion;
        private List<ParticipantResponse> participants;
    }

    @Data
    @Builder
    public static class LeaderboardEntry {
        private Integer rank;
        private Long userId;
        private String name;
        private String avatar;
        private Integer score;
        private Boolean isHost;
    }

    @Data
    @Builder
    public static class BattleEvent {
        private String type;
        private RoomResponse room;
        private Integer correctAnswer;
        private String explanation;
        private List<LeaderboardEntry> leaderboard;
        private Instant nextQuestionAt;
    }

    @Data
    @Builder
    public static class AnswerResponse {
        private Boolean accepted;
        private Integer questionIndex;
        private Long responseTimeMs;
    }
}
