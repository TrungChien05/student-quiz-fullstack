package com.studentquizz.service;

import com.studentquizz.dto.StudyGroupDto;
import com.studentquizz.model.*;
import com.studentquizz.repository.QuizAttemptRepository;
import com.studentquizz.repository.QuizRepository;
import com.studentquizz.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class StudyGroupServiceTests {

    @Autowired
    private StudyGroupService groupService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QuizRepository quizRepository;

    @Autowired
    private QuizAttemptRepository attemptRepository;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void supportsApprovalAssignmentsCompletionAndInternalLeaderboard() {
        long suffix = System.nanoTime();
        User owner = userRepository.save(User.builder()
                .name("Group Owner")
                .email("group-owner-" + suffix + "@test.local")
                .password("password")
                .role("USER")
                .locked(false)
                .build());
        User student = userRepository.save(User.builder()
                .name("Group Student")
                .email("group-student-" + suffix + "@test.local")
                .password("password")
                .role("USER")
                .locked(false)
                .build());

        Quiz quiz = Quiz.builder()
                .title("Group Quiz " + suffix)
                .category("Khác")
                .questionCount(1)
                .playCount(0L)
                .featured(false)
                .author(owner)
                .status("APPROVED")
                .build();
        Question question = Question.builder()
                .content("Câu hỏi kiểm thử")
                .options(List.of("A", "B", "C", "D"))
                .correctAnswer(0)
                .quiz(quiz)
                .build();
        quiz.setQuestions(List.of(question));
        quiz = quizRepository.save(quiz);

        authenticate(owner);
        StudyGroupDto.CreateGroupRequest createRequest = new StudyGroupDto.CreateGroupRequest();
        createRequest.setName("Nhóm học kiểm thử");
        createRequest.setDescription("Kiểm thử đầy đủ luồng nhóm học tập");
        StudyGroupDto.GroupSummary created = groupService.createGroup(createRequest);
        assertEquals(GroupRole.OWNER, created.getCurrentUserRole());
        assertEquals(GroupMemberStatus.APPROVED, created.getMembershipStatus());
        assertTrue(created.getInviteCode().matches("[A-Z0-9]{8}"));

        StudyGroupDto.GroupQuizResponse assignment = groupService.shareQuiz(created.getId(), quiz.getId());
        assertEquals(quiz.getId(), assignment.getQuizId());
        assertFalse(assignment.getCompleted());

        authenticate(student);
        StudyGroupDto.GroupSummary pending = groupService.requestToJoin(created.getInviteCode());
        assertEquals(GroupMemberStatus.PENDING, pending.getMembershipStatus());
        assertNull(pending.getInviteCode());
        assertThrows(ResponseStatusException.class, () -> groupService.getGroupDetail(created.getId()));

        authenticate(owner);
        StudyGroupDto.MemberResponse pendingMember = groupService.getMembers(created.getId()).stream()
                .filter(member -> member.getUserId().equals(student.getId()))
                .findFirst().orElseThrow();
        assertEquals(GroupMemberStatus.PENDING, pendingMember.getStatus());
        groupService.approveMember(created.getId(), pendingMember.getMembershipId());

        authenticate(student);
        StudyGroupDto.GroupDetail studentDetail = groupService.getGroupDetail(created.getId());
        assertEquals(1, studentDetail.getQuizzes().size());
        assertFalse(studentDetail.getQuizzes().get(0).getCompleted());

        attemptRepository.save(QuizAttempt.builder()
                .user(student)
                .quiz(quiz)
                .score(1)
                .totalQuestions(1)
                .build());
        StudyGroupDto.GroupDetail completedDetail = groupService.getGroupDetail(created.getId());
        assertTrue(completedDetail.getQuizzes().get(0).getCompleted());
        assertEquals(1, completedDetail.getQuizzes().get(0).getBestScore());
        assertEquals(student.getId(), completedDetail.getLeaderboard().get(0).getUserId());
        assertEquals(1, completedDetail.getLeaderboard().get(0).getTotalScore());

        authenticate(owner);
        StudyGroupDto.MemberResponse promoted = groupService.updateMemberRole(
                created.getId(), pendingMember.getMembershipId(), GroupRole.ADMIN);
        assertEquals(GroupRole.ADMIN, promoted.getRole());
        String newCode = groupService.regenerateInviteCode(created.getId()).getInviteCode();
        assertNotEquals(created.getInviteCode(), newCode);
    }

    private void authenticate(User user) {
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        org.springframework.security.core.userdetails.User principal =
                new org.springframework.security.core.userdetails.User(user.getEmail(), "", authorities);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, authorities));
    }
}
