package com.studentquizz.repository;

import com.studentquizz.model.BattleParticipant;
import com.studentquizz.model.BattleRoom;
import com.studentquizz.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BattleParticipantRepository extends JpaRepository<BattleParticipant, Long> {
    Optional<BattleParticipant> findByRoomAndUser(BattleRoom room, User user);

    List<BattleParticipant> findByRoomOrderByScoreDescJoinedAtAsc(BattleRoom room);

    long countByRoom(BattleRoom room);
}
