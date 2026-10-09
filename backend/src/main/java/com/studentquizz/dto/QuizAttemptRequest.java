package com.studentquizz.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttemptRequest {
    @NotNull
    @Min(0)
    private Integer score;

    @NotNull
    @Min(1)
    private Integer totalQuestions;

    @Valid
    @Builder.Default
    private List<AnswerInput> answers = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerInput {
        @NotNull
        private Long questionId;
        private Integer selectedAnswer;
    }
}
