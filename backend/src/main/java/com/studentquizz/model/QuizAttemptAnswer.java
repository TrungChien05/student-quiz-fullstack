package com.studentquizz.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "quiz_attempt_answers", indexes = {
        @Index(name = "idx_attempt_answers_attempt", columnList = "attempt_id"),
        @Index(name = "idx_attempt_answers_correct", columnList = "is_correct")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAttemptAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attempt_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private QuizAttempt attempt;

    @Column(name = "question_id")
    private Long questionId;

    @Column(name = "question_content", nullable = false, columnDefinition = "TEXT")
    private String questionContent;

    @Column(name = "selected_answer")
    private Integer selectedAnswer;

    @Column(name = "correct_answer", nullable = false)
    private Integer correctAnswer;

    @Column(name = "selected_option_text", columnDefinition = "TEXT")
    private String selectedOptionText;

    @Column(name = "correct_option_text", nullable = false, columnDefinition = "TEXT")
    private String correctOptionText;

    @Column(name = "is_correct", nullable = false)
    private Boolean correct;
}
