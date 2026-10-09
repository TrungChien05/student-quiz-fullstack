package com.studentquizz.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "battle_answers", uniqueConstraints = {
        @UniqueConstraint(name = "uk_battle_answer_once", columnNames = {"room_id", "participant_id", "question_index"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BattleAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private BattleRoom room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id", nullable = false)
    private BattleParticipant participant;

    @Column(name = "question_index", nullable = false)
    private Integer questionIndex;

    @Column(name = "answer_index", nullable = false)
    private Integer answerIndex;

    @Column(name = "response_time_ms", nullable = false)
    private Long responseTimeMs;

    @Column(nullable = false)
    private Boolean correct;

    @Column(nullable = false)
    private Integer points;

    @Column(name = "answered_at", nullable = false)
    @Builder.Default
    private LocalDateTime answeredAt = LocalDateTime.now();
}
