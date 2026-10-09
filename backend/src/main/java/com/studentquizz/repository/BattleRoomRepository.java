package com.studentquizz.repository;

import com.studentquizz.model.BattleRoom;
import com.studentquizz.model.BattleStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BattleRoomRepository extends JpaRepository<BattleRoom, Long> {
    Optional<BattleRoom> findByRoomCode(String roomCode);

    boolean existsByRoomCode(String roomCode);

    List<BattleRoom> findByStatus(BattleStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select room from BattleRoom room where room.roomCode = :roomCode")
    Optional<BattleRoom> findLockedByRoomCode(@Param("roomCode") String roomCode);
}
