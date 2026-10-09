package com.studentquizz.repository;

import com.studentquizz.model.BattleAnswer;
import com.studentquizz.model.BattleParticipant;
import com.studentquizz.model.BattleRoom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BattleAnswerRepository extends JpaRepository<BattleAnswer, Long> {
    boolean existsByRoomAndParticipantAndQuestionIndex(
            BattleRoom room, BattleParticipant participant, Integer questionIndex);

    long countByRoomAndQuestionIndex(BattleRoom room, Integer questionIndex);
}
