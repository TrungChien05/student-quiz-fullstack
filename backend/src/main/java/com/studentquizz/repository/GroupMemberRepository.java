package com.studentquizz.repository;

import com.studentquizz.model.GroupMember;
import com.studentquizz.model.GroupMemberStatus;
import com.studentquizz.model.StudyGroup;
import com.studentquizz.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    Optional<GroupMember> findByStudyGroupAndUser(StudyGroup studyGroup, User user);

    List<GroupMember> findByStudyGroupAndStatusOrderByJoinedAtAsc(
            StudyGroup studyGroup, GroupMemberStatus status);

    List<GroupMember> findByStudyGroupOrderByStatusAscJoinedAtAsc(StudyGroup studyGroup);

    long countByStudyGroupAndStatus(StudyGroup studyGroup, GroupMemberStatus status);

    @Query("select member from GroupMember member " +
            "join fetch member.studyGroup studyGroup " +
            "join fetch studyGroup.owner " +
            "where member.user = :user and member.status = :status " +
            "order by member.joinedAt desc")
    List<GroupMember> findGroupsForUser(
            @Param("user") User user,
            @Param("status") GroupMemberStatus status);

    @Query("select member from GroupMember member " +
            "join fetch member.studyGroup studyGroup " +
            "join fetch studyGroup.owner " +
            "where member.user = :user order by member.joinedAt desc")
    List<GroupMember> findAllGroupsForUser(@Param("user") User user);
}
