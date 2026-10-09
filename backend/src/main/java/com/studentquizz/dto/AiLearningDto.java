package com.studentquizz.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class AiLearningDto {
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ExplainQuestionRequest {
        private Long questionId;

        @NotBlank @Size(max = 5000)
        private String question;

        @NotNull @Size(min = 2, max = 6)
        private List<@NotBlank @Size(max = 2000) String> options;

        @NotNull @Min(0) @Max(5)
        private Integer correctAnswer;

        @Min(0) @Max(5)
        private Integer selectedAnswer;

        @Size(max = 5000)
        private String existingExplanation;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ExplainQuestionResponse {
        private String overview;
        @Builder.Default private List<String> steps = new ArrayList<>();
        @Builder.Default private List<OptionAnalysis> optionAnalyses = new ArrayList<>();
        private String studyTip;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class OptionAnalysis {
        private Integer optionIndex;
        private String optionText;
        private Boolean correct;
        private Boolean selected;
        private String explanation;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class WeaknessAnalysisResponse {
        @Builder.Default private List<String> strengths = new ArrayList<>();
        @Builder.Default private List<WeaknessInsight> weaknesses = new ArrayList<>();
        @Builder.Default private List<String> recommendations = new ArrayList<>();
        @Builder.Default private List<QuestionDto> reviewQuestions = new ArrayList<>();
        private Integer analyzedAttempts;
        private Integer analyzedWrongAnswers;
        private Boolean insufficientData;
        private LocalDateTime generatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class WeaknessInsight {
        private String topic;
        private String reason;
        private String priority; // HIGH | MEDIUM | LOW
    }
}
