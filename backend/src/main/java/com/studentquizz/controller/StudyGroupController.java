package com.studentquizz.controller;

import com.studentquizz.dto.StudyGroupDto;
import com.studentquizz.service.StudyGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class StudyGroupController {
    private final StudyGroupService groupService;

    @GetMapping
    public ResponseEntity<List<StudyGroupDto.GroupSummary>> getMyGroups() {
        return ResponseEntity.ok(groupService.getMyGroups());
    }

    @PostMapping
    public ResponseEntity<StudyGroupDto.GroupSummary> createGroup(
            @Valid @RequestBody StudyGroupDto.CreateGroupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(groupService.createGroup(request));
    }

    @PostMapping("/join")
    public ResponseEntity<StudyGroupDto.GroupSummary> joinGroup(
            @Valid @RequestBody StudyGroupDto.JoinGroupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupService.requestToJoin(request.getInviteCode()));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<StudyGroupDto.GroupDetail> getGroup(@PathVariable Long groupId) {
        return ResponseEntity.ok(groupService.getGroupDetail(groupId));
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<List<StudyGroupDto.MemberResponse>> getMembers(@PathVariable Long groupId) {
        return ResponseEntity.ok(groupService.getMembers(groupId));
    }

    @PatchMapping("/{groupId}/members/{membershipId}/approve")
    public ResponseEntity<StudyGroupDto.MemberResponse> approveMember(
            @PathVariable Long groupId,
            @PathVariable Long membershipId) {
        return ResponseEntity.ok(groupService.approveMember(groupId, membershipId));
    }

    @PatchMapping("/{groupId}/members/{membershipId}/role")
    public ResponseEntity<StudyGroupDto.MemberResponse> updateMemberRole(
            @PathVariable Long groupId,
            @PathVariable Long membershipId,
            @Valid @RequestBody StudyGroupDto.UpdateRoleRequest request) {
        return ResponseEntity.ok(groupService.updateMemberRole(groupId, membershipId, request.getRole()));
    }

    @DeleteMapping("/{groupId}/members/{membershipId}")
    public ResponseEntity<Map<String, String>> removeMember(
            @PathVariable Long groupId,
            @PathVariable Long membershipId) {
        groupService.removeMember(groupId, membershipId);
        return ResponseEntity.ok(Map.of("message", "Đã xóa thành viên khỏi nhóm."));
    }

    @PostMapping("/{groupId}/invite-code/regenerate")
    public ResponseEntity<StudyGroupDto.InviteCodeResponse> regenerateInviteCode(
            @PathVariable Long groupId) {
        return ResponseEntity.ok(groupService.regenerateInviteCode(groupId));
    }

    @GetMapping("/{groupId}/quizzes")
    public ResponseEntity<List<StudyGroupDto.GroupQuizResponse>> getQuizzes(@PathVariable Long groupId) {
        return ResponseEntity.ok(groupService.getGroupQuizzes(groupId));
    }

    @PostMapping("/{groupId}/quizzes")
    public ResponseEntity<StudyGroupDto.GroupQuizResponse> shareQuiz(
            @PathVariable Long groupId,
            @Valid @RequestBody StudyGroupDto.ShareQuizRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupService.shareQuiz(groupId, request.getQuizId()));
    }

    @DeleteMapping("/{groupId}/quizzes/{assignmentId}")
    public ResponseEntity<Map<String, String>> removeQuiz(
            @PathVariable Long groupId,
            @PathVariable Long assignmentId) {
        groupService.removeQuiz(groupId, assignmentId);
        return ResponseEntity.ok(Map.of("message", "Đã gỡ bài Quiz khỏi nhóm."));
    }

    @GetMapping("/{groupId}/leaderboard")
    public ResponseEntity<List<StudyGroupDto.LeaderboardEntry>> getLeaderboard(
            @PathVariable Long groupId) {
        return ResponseEntity.ok(groupService.getLeaderboard(groupId));
    }
}
