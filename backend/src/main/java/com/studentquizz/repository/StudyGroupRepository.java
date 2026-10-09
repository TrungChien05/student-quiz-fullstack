package com.studentquizz.repository;

import com.studentquizz.model.StudyGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StudyGroupRepository extends JpaRepository<StudyGroup, Long> {
    Optional<StudyGroup> findByInviteCodeIgnoreCase(String inviteCode);
    boolean existsByInviteCodeIgnoreCase(String inviteCode);
}
