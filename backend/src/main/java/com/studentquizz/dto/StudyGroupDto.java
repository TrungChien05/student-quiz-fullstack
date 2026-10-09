package com.studentquizz.dto;

import com.studentquizz.model.GroupMemberStatus;
import com.studentquizz.model.GroupRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

public final class StudyGroupDto {
    private StudyGroupDto() {}

    @Data
    public static class CreateGroupRequest {
        @NotBlank(message = "Tên nhóm không được để trống")
        @Size(max = 120, message = "Tên nhóm tối đa 120 ký tự")
        private String name;

        @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự")
        private String description;
    }

    @Data
    public static class JoinGroupRequest {
        @NotBlank(message = "Mã mời không được để trống")
        @Pattern(regexp = "[A-Za-z0-9]{8}", message = "Mã mời phải gồm đúng 8 ký tự")
        private String inviteCode;
    }

    @Data
    public static class ShareQuizRequest {
        @NotNull
        private Long quizId;
    }

    @Data
    public static class UpdateRoleRequest {
        @NotNull
        private GroupRole role;
    }

    @Data
    @Builder
    public static class UserSummary {
        private Long id;
        private String name;
        private String avatar;
    }

    @Data
    @Builder
    public static class GroupSummary {
        private Long id;
        private String name;
        private String description;
        private String inviteCode;
        private UserSummary owner;
        private GroupRole currentUserRole;
        private GroupMemberStatus membershipStatus;
        private Boolean canManage;
        private Long memberCount;
        private Long quizCount;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class GroupDetail {
        private GroupSummary group;
        private List<GroupQuizResponse> quizzes;
        private List<LeaderboardEntry> leaderboard;
    }

    @Data
    @Builder
    public static class MemberResponse {
        private Long membershipId;
        private Long userId;
        private String name;
        private String avatar;
        private GroupRole role;
        private GroupMemberStatus status;
        private LocalDateTime joinedAt;
    }

    @Data
    @Builder
    public static class GroupQuizResponse {
        private Long assignmentId;
        private Long quizId;
        private String title;
        private String category;
        private Integer questionCount;
        private String authorName;
        private LocalDateTime assignedAt;
        private String assignedByName;
        private Boolean completed;
        private Integer bestScore;
        private Integer totalQuestions;
    }

    @Data
    @Builder
    public static class LeaderboardEntry {
        private Integer rank;
        private Long userId;
        private String name;
        private String avatar;
        private GroupRole role;
        private Integer completedQuizzes;
        private Integer totalScore;
    }

    @Data
    @Builder
    public static class InviteCodeResponse {
        private String inviteCode;
    }
}
