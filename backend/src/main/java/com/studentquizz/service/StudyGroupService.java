package com.studentquizz.service;

import com.studentquizz.dto.StudyGroupDto;
import com.studentquizz.model.*;
import com.studentquizz.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudyGroupService {
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final StudyGroupRepository groupRepository;
    private final GroupMemberRepository memberRepository;
    private final GroupQuizRepository groupQuizRepository;
    private final QuizRepository quizRepository;
    private final QuizAttemptRepository attemptRepository;
    private final UserRepository userRepository;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public StudyGroupDto.GroupSummary createGroup(StudyGroupDto.CreateGroupRequest request) {
        User owner = currentUser();
        StudyGroup group = groupRepository.save(StudyGroup.builder()
                .name(request.getName().trim())
                .description(normalizeDescription(request.getDescription()))
                .inviteCode(generateInviteCode())
                .owner(owner)
                .build());
        GroupMember membership = memberRepository.save(GroupMember.builder()
                .studyGroup(group)
                .user(owner)
                .role(GroupRole.OWNER)
                .status(GroupMemberStatus.APPROVED)
                .build());
        return toSummary(membership);
    }

    @Transactional(readOnly = true)
    public List<StudyGroupDto.GroupSummary> getMyGroups() {
        return memberRepository.findAllGroupsForUser(currentUser()).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public StudyGroupDto.GroupSummary requestToJoin(String rawInviteCode) {
        User user = currentUser();
        String inviteCode = normalizeInviteCode(rawInviteCode);
        StudyGroup group = groupRepository.findByInviteCodeIgnoreCase(inviteCode)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Mã mời không tồn tại hoặc đã được cấp lại."));
        Optional<GroupMember> existing = memberRepository.findByStudyGroupAndUser(group, user);
        if (existing.isPresent()) {
            if (existing.get().getStatus() == GroupMemberStatus.APPROVED) {
                throw error(HttpStatus.CONFLICT, "Bạn đã là thành viên của nhóm này.");
            }
            throw error(HttpStatus.CONFLICT, "Yêu cầu tham gia của bạn đang chờ duyệt.");
        }
        GroupMember pending = memberRepository.save(GroupMember.builder()
                .studyGroup(group)
                .user(user)
                .role(GroupRole.MEMBER)
                .status(GroupMemberStatus.PENDING)
                .build());
        return toSummary(pending);
    }

    @Transactional(readOnly = true)
    public StudyGroupDto.GroupDetail getGroupDetail(Long groupId) {
        StudyGroup group = findGroup(groupId);
        User user = currentUser();
        requireApprovedMember(group, user);
        return StudyGroupDto.GroupDetail.builder()
                .group(toSummary(requireMembership(group, user)))
                .quizzes(getGroupQuizzesInternal(group, user))
                .leaderboard(getLeaderboardInternal(group))
                .build();
    }

    @Transactional(readOnly = true)
    public List<StudyGroupDto.MemberResponse> getMembers(Long groupId) {
        StudyGroup group = findGroup(groupId);
        GroupMember current = requireApprovedMember(group, currentUser());
        List<GroupMember> members = canManage(current)
                ? memberRepository.findByStudyGroupOrderByStatusAscJoinedAtAsc(group)
                : memberRepository.findByStudyGroupAndStatusOrderByJoinedAtAsc(group, GroupMemberStatus.APPROVED);
        return members.stream().map(this::toMemberResponse).toList();
    }

    @Transactional
    public StudyGroupDto.MemberResponse approveMember(Long groupId, Long membershipId) {
        StudyGroup group = findGroup(groupId);
        requireManager(group, currentUser());
        GroupMember target = membershipInGroup(group, membershipId);
        if (target.getStatus() != GroupMemberStatus.PENDING) {
            throw error(HttpStatus.CONFLICT, "Thành viên này đã được xử lý.");
        }
        target.setStatus(GroupMemberStatus.APPROVED);
        return toMemberResponse(target);
    }

    @Transactional
    public void removeMember(Long groupId, Long membershipId) {
        StudyGroup group = findGroup(groupId);
        GroupMember actor = requireManager(group, currentUser());
        GroupMember target = membershipInGroup(group, membershipId);
        if (target.getRole() == GroupRole.OWNER) {
            throw error(HttpStatus.BAD_REQUEST, "Không thể xóa chủ sở hữu nhóm.");
        }
        if (actor.getRole() == GroupRole.ADMIN && target.getRole() != GroupRole.MEMBER) {
            throw error(HttpStatus.FORBIDDEN, "Quản trị viên không thể xóa chủ nhóm hoặc quản trị viên khác.");
        }
        memberRepository.delete(target);
    }

    @Transactional
    public StudyGroupDto.MemberResponse updateMemberRole(
            Long groupId, Long membershipId, GroupRole newRole) {
        StudyGroup group = findGroup(groupId);
        requireOwner(group, currentUser());
        if (newRole != GroupRole.ADMIN && newRole != GroupRole.MEMBER) {
            throw error(HttpStatus.BAD_REQUEST, "Chỉ có thể cấp vai trò ADMIN hoặc MEMBER.");
        }
        GroupMember target = membershipInGroup(group, membershipId);
        if (target.getRole() == GroupRole.OWNER || target.getStatus() != GroupMemberStatus.APPROVED) {
            throw error(HttpStatus.BAD_REQUEST, "Không thể thay đổi vai trò của thành viên này.");
        }
        target.setRole(newRole);
        return toMemberResponse(target);
    }

    @Transactional
    public StudyGroupDto.InviteCodeResponse regenerateInviteCode(Long groupId) {
        StudyGroup group = findGroup(groupId);
        requireOwner(group, currentUser());
        group.setInviteCode(generateInviteCode());
        return StudyGroupDto.InviteCodeResponse.builder()
                .inviteCode(group.getInviteCode())
                .build();
    }

    @Transactional
    public StudyGroupDto.GroupQuizResponse shareQuiz(Long groupId, Long quizId) {
        StudyGroup group = findGroup(groupId);
        User user = currentUser();
        requireManager(group, user);
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy bài Quiz."));
        if (!"APPROVED".equals(quiz.getStatus())) {
            throw error(HttpStatus.BAD_REQUEST, "Chỉ có thể chia sẻ bài Quiz đã được duyệt.");
        }
        if (groupQuizRepository.findByStudyGroupAndQuiz(group, quiz).isPresent()) {
            throw error(HttpStatus.CONFLICT, "Bài Quiz này đã có trong nhóm.");
        }
        GroupQuiz assignment = groupQuizRepository.save(GroupQuiz.builder()
                .studyGroup(group)
                .quiz(quiz)
                .assignedBy(user)
                .build());
        return toQuizResponse(assignment, null);
    }

    @Transactional
    public void removeQuiz(Long groupId, Long assignmentId) {
        StudyGroup group = findGroup(groupId);
        requireManager(group, currentUser());
        GroupQuiz assignment = groupQuizRepository.findById(assignmentId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập trong nhóm."));
        if (!Objects.equals(assignment.getStudyGroup().getId(), group.getId())) {
            throw error(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập trong nhóm.");
        }
        groupQuizRepository.delete(assignment);
    }

    @Transactional(readOnly = true)
    public List<StudyGroupDto.GroupQuizResponse> getGroupQuizzes(Long groupId) {
        StudyGroup group = findGroup(groupId);
        User user = currentUser();
        requireApprovedMember(group, user);
        return getGroupQuizzesInternal(group, user);
    }

    @Transactional(readOnly = true)
    public List<StudyGroupDto.LeaderboardEntry> getLeaderboard(Long groupId) {
        StudyGroup group = findGroup(groupId);
        requireApprovedMember(group, currentUser());
        return getLeaderboardInternal(group);
    }

    private List<StudyGroupDto.GroupQuizResponse> getGroupQuizzesInternal(StudyGroup group, User user) {
        List<GroupQuiz> assignments = groupQuizRepository.findByStudyGroupOrderByAssignedAtDesc(group);
        List<Long> quizIds = assignments.stream().map(item -> item.getQuiz().getId()).toList();
        Map<Long, QuizAttempt> bestAttempts = bestAttempts(user.getId(), quizIds);
        return assignments.stream()
                .map(assignment -> toQuizResponse(bestAttempts.get(assignment.getQuiz().getId()), assignment))
                .toList();
    }

    private List<StudyGroupDto.LeaderboardEntry> getLeaderboardInternal(StudyGroup group) {
        List<GroupQuiz> assignments = groupQuizRepository.findByStudyGroupOrderByAssignedAtDesc(group);
        List<Long> quizIds = assignments.stream().map(item -> item.getQuiz().getId()).toList();
        List<GroupMember> members = memberRepository.findByStudyGroupAndStatusOrderByJoinedAtAsc(
                group, GroupMemberStatus.APPROVED);

        List<LeaderboardRow> rows = members.stream().map(member -> {
            Map<Long, QuizAttempt> best = bestAttempts(member.getUser().getId(), quizIds);
            int totalScore = best.values().stream().mapToInt(QuizAttempt::getScore).sum();
            return new LeaderboardRow(member, best.size(), totalScore);
        }).sorted(Comparator.comparingInt(LeaderboardRow::totalScore).reversed()
                .thenComparing(Comparator.comparingInt(LeaderboardRow::completedQuizzes).reversed())
                .thenComparing(row -> row.member().getUser().getName(), String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<StudyGroupDto.LeaderboardEntry> result = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            LeaderboardRow row = rows.get(i);
            User user = row.member().getUser();
            result.add(StudyGroupDto.LeaderboardEntry.builder()
                    .rank(i + 1)
                    .userId(user.getId())
                    .name(user.getName())
                    .avatar(user.getAvatar())
                    .role(row.member().getRole())
                    .completedQuizzes(row.completedQuizzes())
                    .totalScore(row.totalScore())
                    .build());
        }
        return result;
    }

    private Map<Long, QuizAttempt> bestAttempts(Long userId, List<Long> quizIds) {
        if (quizIds.isEmpty()) return Map.of();
        return attemptRepository.findByUserIdAndQuizIdIn(userId, quizIds).stream()
                .collect(Collectors.toMap(
                        attempt -> attempt.getQuiz().getId(),
                        Function.identity(),
                        (first, second) -> first.getScore() >= second.getScore() ? first : second));
    }

    private StudyGroupDto.GroupSummary toSummary(GroupMember membership) {
        StudyGroup group = membership.getStudyGroup();
        boolean manager = membership.getStatus() == GroupMemberStatus.APPROVED && canManage(membership);
        return StudyGroupDto.GroupSummary.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .inviteCode(manager ? group.getInviteCode() : null)
                .owner(toUserSummary(group.getOwner()))
                .currentUserRole(membership.getRole())
                .membershipStatus(membership.getStatus())
                .canManage(manager)
                .memberCount(memberRepository.countByStudyGroupAndStatus(group, GroupMemberStatus.APPROVED))
                .quizCount(groupQuizRepository.countByStudyGroup(group))
                .createdAt(group.getCreatedAt())
                .build();
    }

    private StudyGroupDto.MemberResponse toMemberResponse(GroupMember member) {
        User user = member.getUser();
        return StudyGroupDto.MemberResponse.builder()
                .membershipId(member.getId())
                .userId(user.getId())
                .name(user.getName())
                .avatar(user.getAvatar())
                .role(member.getRole())
                .status(member.getStatus())
                .joinedAt(member.getJoinedAt())
                .build();
    }

    private StudyGroupDto.GroupQuizResponse toQuizResponse(GroupQuiz assignment, QuizAttempt attempt) {
        return toQuizResponse(attempt, assignment);
    }

    private StudyGroupDto.GroupQuizResponse toQuizResponse(QuizAttempt attempt, GroupQuiz assignment) {
        Quiz quiz = assignment.getQuiz();
        return StudyGroupDto.GroupQuizResponse.builder()
                .assignmentId(assignment.getId())
                .quizId(quiz.getId())
                .title(quiz.getTitle())
                .category(quiz.getCategory())
                .questionCount(quiz.getQuestionCount())
                .authorName(quiz.getAuthor() != null ? quiz.getAuthor().getName() : "StudentQuizz")
                .assignedAt(assignment.getAssignedAt())
                .assignedByName(assignment.getAssignedBy().getName())
                .completed(attempt != null)
                .bestScore(attempt != null ? attempt.getScore() : null)
                .totalQuestions(attempt != null ? attempt.getTotalQuestions() : quiz.getQuestionCount())
                .build();
    }

    private StudyGroupDto.UserSummary toUserSummary(User user) {
        return StudyGroupDto.UserSummary.builder()
                .id(user.getId())
                .name(user.getName())
                .avatar(user.getAvatar())
                .build();
    }

    private StudyGroup findGroup(Long groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy nhóm học tập."));
    }

    private GroupMember requireMembership(StudyGroup group, User user) {
        return memberRepository.findByStudyGroupAndUser(group, user)
                .orElseThrow(() -> error(HttpStatus.FORBIDDEN, "Bạn không thuộc nhóm học tập này."));
    }

    private GroupMember requireApprovedMember(StudyGroup group, User user) {
        GroupMember member = requireMembership(group, user);
        if (member.getStatus() != GroupMemberStatus.APPROVED) {
            throw error(HttpStatus.FORBIDDEN, "Yêu cầu tham gia nhóm của bạn đang chờ duyệt.");
        }
        return member;
    }

    private GroupMember requireManager(StudyGroup group, User user) {
        GroupMember member = requireApprovedMember(group, user);
        if (!canManage(member)) {
            throw error(HttpStatus.FORBIDDEN, "Bạn không có quyền quản trị nhóm.");
        }
        return member;
    }

    private void requireOwner(StudyGroup group, User user) {
        GroupMember member = requireApprovedMember(group, user);
        if (member.getRole() != GroupRole.OWNER) {
            throw error(HttpStatus.FORBIDDEN, "Chỉ chủ sở hữu nhóm mới có quyền này.");
        }
    }

    private boolean canManage(GroupMember member) {
        return member.getRole() == GroupRole.OWNER || member.getRole() == GroupRole.ADMIN;
    }

    private GroupMember membershipInGroup(StudyGroup group, Long membershipId) {
        GroupMember membership = memberRepository.findById(membershipId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên."));
        if (!Objects.equals(membership.getStudyGroup().getId(), group.getId())) {
            throw error(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong nhóm.");
        }
        return membership;
    }

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "Người dùng chưa đăng nhập."));
    }

    private String generateInviteCode() {
        for (int attempt = 0; attempt < 40; attempt++) {
            StringBuilder code = new StringBuilder(8);
            for (int i = 0; i < 8; i++) {
                code.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
            }
            if (!groupRepository.existsByInviteCodeIgnoreCase(code.toString())) return code.toString();
        }
        throw error(HttpStatus.SERVICE_UNAVAILABLE, "Chưa thể tạo mã mời, vui lòng thử lại.");
    }

    private String normalizeInviteCode(String inviteCode) {
        String normalized = inviteCode == null ? "" : inviteCode.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z0-9]{8}")) {
            throw error(HttpStatus.BAD_REQUEST, "Mã mời phải gồm đúng 8 ký tự.");
        }
        return normalized;
    }

    private String normalizeDescription(String description) {
        if (description == null || description.isBlank()) return null;
        return description.trim();
    }

    private ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }

    private record LeaderboardRow(GroupMember member, int completedQuizzes, int totalScore) {}
}
