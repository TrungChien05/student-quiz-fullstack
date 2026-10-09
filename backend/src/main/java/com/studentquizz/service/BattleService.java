package com.studentquizz.service;

import com.studentquizz.dto.BattleDto;
import com.studentquizz.model.*;
import com.studentquizz.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class BattleService {
    public static final int QUESTION_SECONDS = 20;
    public static final int LEADERBOARD_SECONDS = 4;
    public static final int MAX_PLAYERS = 30;

    private final BattleRoomRepository roomRepository;
    private final BattleParticipantRepository participantRepository;
    private final BattleAnswerRepository answerRepository;
    private final QuizRepository quizRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final TaskScheduler battleTaskScheduler;
    private final TransactionTemplate transactionTemplate;

    private final SecureRandom random = new SecureRandom();
    private final Map<String, ScheduledFuture<?>> scheduledTransitions = new ConcurrentHashMap<>();

    @Transactional
    public BattleDto.RoomResponse createRoom(Long quizId) {
        User host = currentUser();
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy bài Quiz."));
        if (!"APPROVED".equals(quiz.getStatus())) {
            throw error(HttpStatus.BAD_REQUEST, "Chỉ có thể tạo trận đấu từ bài Quiz đã được duyệt.");
        }
        if (questions(quiz).isEmpty()) {
            throw error(HttpStatus.BAD_REQUEST, "Bài Quiz chưa có câu hỏi để thi đấu.");
        }

        BattleRoom room = roomRepository.save(BattleRoom.builder()
                .roomCode(generateRoomCode())
                .hostUser(host)
                .quiz(quiz)
                .build());
        participantRepository.save(BattleParticipant.builder()
                .room(room)
                .user(host)
                .isHost(true)
                .build());

        return toRoomResponse(room);
    }

    @Transactional
    public BattleDto.RoomResponse joinRoom(String rawRoomCode) {
        String roomCode = normalizeCode(rawRoomCode);
        User user = currentUser();
        BattleRoom room = lockedRoom(roomCode);
        if (room.getStatus() != BattleStatus.WAITING) {
            throw error(HttpStatus.CONFLICT, "Trận đấu đã bắt đầu hoặc đã kết thúc.");
        }

        Optional<BattleParticipant> existing = participantRepository.findByRoomAndUser(room, user);
        if (existing.isEmpty()) {
            if (participantRepository.countByRoom(room) >= MAX_PLAYERS) {
                throw error(HttpStatus.CONFLICT, "Phòng đã đủ " + MAX_PLAYERS + " người chơi.");
            }
            participantRepository.save(BattleParticipant.builder()
                    .room(room)
                    .user(user)
                    .isHost(false)
                    .build());
        }

        BattleDto.RoomResponse response = toRoomResponse(room);
        if (existing.isEmpty()) {
            afterCommit(() -> broadcast(roomCode, BattleDto.BattleEvent.builder()
                    .type("ROOM_UPDATED")
                    .room(response)
                    .build()));
        }
        return response;
    }

    @Transactional(readOnly = true)
    public BattleDto.RoomResponse getRoom(String rawRoomCode) {
        BattleRoom room = roomRepository.findByRoomCode(normalizeCode(rawRoomCode))
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy phòng đấu."));
        ensureParticipant(room, currentUser());
        return toRoomResponse(room);
    }

    @Transactional
    public BattleDto.RoomResponse startBattle(String rawRoomCode) {
        String roomCode = normalizeCode(rawRoomCode);
        User user = currentUser();
        BattleRoom room = lockedRoom(roomCode);
        ensureHost(room, user);
        if (room.getStatus() != BattleStatus.WAITING) {
            throw error(HttpStatus.CONFLICT, "Phòng không còn ở trạng thái chờ.");
        }

        List<Question> questions = questions(room.getQuiz());
        if (questions.isEmpty()) {
            throw error(HttpStatus.BAD_REQUEST, "Bài Quiz chưa có câu hỏi để bắt đầu.");
        }

        LocalDateTime now = LocalDateTime.now();
        room.setStatus(BattleStatus.PLAYING);
        room.setCurrentQuestionIndex(0);
        room.setQuestionStartedAt(now);
        room.setQuestionDeadline(now.plusSeconds(QUESTION_SECONDS));
        BattleDto.RoomResponse response = toRoomResponse(room);

        afterCommit(() -> {
            broadcast(roomCode, BattleDto.BattleEvent.builder()
                    .type("QUESTION")
                    .room(response)
                    .build());
            scheduleClose(roomCode, 0, room.getQuestionDeadline());
        });
        return response;
    }

    @Transactional
    public BattleDto.AnswerResponse submitAnswer(String rawRoomCode, BattleDto.AnswerRequest request) {
        String roomCode = normalizeCode(rawRoomCode);
        BattleRoom room = lockedRoom(roomCode);
        User user = currentUser();
        BattleParticipant participant = ensureParticipant(room, user);

        if (room.getStatus() != BattleStatus.PLAYING
                || room.getQuestionDeadline() == null
                || !Objects.equals(room.getCurrentQuestionIndex(), request.getQuestionIndex())) {
            throw error(HttpStatus.CONFLICT, "Câu hỏi này đã đóng hoặc chưa bắt đầu.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(room.getQuestionDeadline())) {
            afterCommit(() -> scheduleClose(roomCode, room.getCurrentQuestionIndex(), now));
            throw error(HttpStatus.CONFLICT, "Đã hết thời gian trả lời câu hỏi.");
        }
        if (answerRepository.existsByRoomAndParticipantAndQuestionIndex(
                room, participant, request.getQuestionIndex())) {
            throw error(HttpStatus.CONFLICT, "Bạn đã trả lời câu hỏi này rồi.");
        }

        Question question = questions(room.getQuiz()).get(request.getQuestionIndex());
        if (request.getAnswerIndex() >= question.getOptions().size()) {
            throw error(HttpStatus.BAD_REQUEST, "Lựa chọn trả lời không hợp lệ.");
        }

        long serverResponseTime = Math.max(0L, Duration.between(room.getQuestionStartedAt(), now).toMillis());
        serverResponseTime = Math.min(serverResponseTime, QUESTION_SECONDS * 1000L);
        boolean correct = Objects.equals(question.getCorrectAnswer(), request.getAnswerIndex());
        int points = correct ? calculatePoints(serverResponseTime) : 0;

        answerRepository.save(BattleAnswer.builder()
                .room(room)
                .participant(participant)
                .questionIndex(request.getQuestionIndex())
                .answerIndex(request.getAnswerIndex())
                .responseTimeMs(serverResponseTime)
                .correct(correct)
                .points(points)
                .build());
        participant.setScore(participant.getScore() + points);

        long answers = answerRepository.countByRoomAndQuestionIndex(room, request.getQuestionIndex());
        long players = participantRepository.countByRoom(room);
        if (answers >= players) {
            int questionIndex = request.getQuestionIndex();
            afterCommit(() -> scheduleClose(roomCode, questionIndex, LocalDateTime.now()));
        }

        return BattleDto.AnswerResponse.builder()
                .accepted(true)
                .questionIndex(request.getQuestionIndex())
                .responseTimeMs(serverResponseTime)
                .build();
    }

    private void closeQuestion(String roomCode, int questionIndex) {
        try {
            Transition transition = transactionTemplate.execute(status -> {
                BattleRoom room = roomRepository.findLockedByRoomCode(roomCode).orElse(null);
                if (room == null || room.getStatus() != BattleStatus.PLAYING
                        || !Objects.equals(room.getCurrentQuestionIndex(), questionIndex)
                        || room.getQuestionDeadline() == null) {
                    return null;
                }

                Question question = questions(room.getQuiz()).get(questionIndex);
                LocalDateTime nextQuestionAt = LocalDateTime.now().plusSeconds(LEADERBOARD_SECONDS);
                room.setQuestionDeadline(null);
                room.setQuestionStartedAt(null);
                BattleDto.BattleEvent event = BattleDto.BattleEvent.builder()
                        .type("LEADERBOARD")
                        .room(toRoomResponse(room))
                        .correctAnswer(question.getCorrectAnswer())
                        .explanation(question.getExplanation())
                        .leaderboard(toLeaderboard(room))
                        .nextQuestionAt(toInstant(nextQuestionAt))
                        .build();
                return new Transition(event, nextQuestionAt);
            });
            if (transition == null) return;

            broadcast(roomCode, transition.event());
            scheduleAdvance(roomCode, questionIndex, transition.when());
        } catch (Exception ex) {
            log.error("Không thể đóng câu hỏi {} của phòng {}", questionIndex, roomCode, ex);
        }
    }

    private void advanceBattle(String roomCode, int completedQuestionIndex) {
        try {
            Advance transition = transactionTemplate.execute(status -> {
                BattleRoom room = roomRepository.findLockedByRoomCode(roomCode).orElse(null);
                if (room == null || room.getStatus() != BattleStatus.PLAYING
                        || !Objects.equals(room.getCurrentQuestionIndex(), completedQuestionIndex)
                        || room.getQuestionDeadline() != null) {
                    return null;
                }

                int nextIndex = completedQuestionIndex + 1;
                if (nextIndex >= questions(room.getQuiz()).size()) {
                    room.setStatus(BattleStatus.FINISHED);
                    BattleDto.BattleEvent event = BattleDto.BattleEvent.builder()
                            .type("FINISHED")
                            .room(toRoomResponse(room))
                            .leaderboard(toLeaderboard(room))
                            .build();
                    return new Advance(event, null, nextIndex);
                }

                LocalDateTime now = LocalDateTime.now();
                room.setCurrentQuestionIndex(nextIndex);
                room.setQuestionStartedAt(now);
                room.setQuestionDeadline(now.plusSeconds(QUESTION_SECONDS));
                BattleDto.BattleEvent event = BattleDto.BattleEvent.builder()
                        .type("QUESTION")
                        .room(toRoomResponse(room))
                        .build();
                return new Advance(event, room.getQuestionDeadline(), nextIndex);
            });
            if (transition == null) return;

            broadcast(roomCode, transition.event());
            if (transition.deadline() != null) {
                scheduleClose(roomCode, transition.questionIndex(), transition.deadline());
            } else {
                scheduledTransitions.remove(roomCode);
            }
        } catch (Exception ex) {
            log.error("Không thể chuyển câu hỏi cho phòng {}", roomCode, ex);
        }
    }

    private BattleDto.RoomResponse toRoomResponse(BattleRoom room) {
        List<Question> questions = questions(room.getQuiz());
        BattleDto.QuestionResponse currentQuestion = null;
        int index = room.getCurrentQuestionIndex() == null ? -1 : room.getCurrentQuestionIndex();
        if (room.getStatus() == BattleStatus.PLAYING
                && room.getQuestionDeadline() != null
                && index >= 0 && index < questions.size()) {
            Question question = questions.get(index);
            currentQuestion = BattleDto.QuestionResponse.builder()
                    .index(index)
                    .totalQuestions(questions.size())
                    .content(question.getContent())
                    .options(List.copyOf(question.getOptions()))
                    .startedAt(toInstant(room.getQuestionStartedAt()))
                    .deadline(toInstant(room.getQuestionDeadline()))
                    .build();
        }

        return BattleDto.RoomResponse.builder()
                .id(room.getId())
                .roomCode(room.getRoomCode())
                .quizId(room.getQuiz().getId())
                .quizTitle(room.getQuiz().getTitle())
                .hostUserId(room.getHostUser().getId())
                .status(room.getStatus())
                .currentQuestionIndex(index)
                .totalQuestions(questions.size())
                .createdAt(room.getCreatedAt())
                .currentQuestion(currentQuestion)
                .participants(participantRepository.findByRoomOrderByScoreDescJoinedAtAsc(room)
                        .stream().map(this::toParticipant).toList())
                .build();
    }

    private BattleDto.ParticipantResponse toParticipant(BattleParticipant participant) {
        User user = participant.getUser();
        return BattleDto.ParticipantResponse.builder()
                .id(participant.getId())
                .userId(user.getId())
                .name(user.getName())
                .avatar(user.getAvatar())
                .score(participant.getScore())
                .isHost(participant.getIsHost())
                .build();
    }

    private List<BattleDto.LeaderboardEntry> toLeaderboard(BattleRoom room) {
        List<BattleParticipant> participants = participantRepository.findByRoomOrderByScoreDescJoinedAtAsc(room);
        List<BattleDto.LeaderboardEntry> result = new ArrayList<>();
        for (int i = 0; i < participants.size(); i++) {
            BattleParticipant participant = participants.get(i);
            User user = participant.getUser();
            result.add(BattleDto.LeaderboardEntry.builder()
                    .rank(i + 1)
                    .userId(user.getId())
                    .name(user.getName())
                    .avatar(user.getAvatar())
                    .score(participant.getScore())
                    .isHost(participant.getIsHost())
                    .build());
        }
        return result;
    }

    private List<Question> questions(Quiz quiz) {
        if (quiz.getQuestions() == null) return List.of();
        return quiz.getQuestions().stream()
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();
    }

    private int calculatePoints(long responseTimeMs) {
        double remainingRatio = 1.0 - ((double) responseTimeMs / (QUESTION_SECONDS * 1000L));
        return 500 + (int) Math.round(500 * Math.max(0, remainingRatio));
    }

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "Người dùng chưa đăng nhập."));
    }

    private BattleRoom lockedRoom(String roomCode) {
        return roomRepository.findLockedByRoomCode(roomCode)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy phòng đấu."));
    }

    private BattleParticipant ensureParticipant(BattleRoom room, User user) {
        return participantRepository.findByRoomAndUser(room, user)
                .orElseThrow(() -> error(HttpStatus.FORBIDDEN, "Bạn chưa tham gia phòng đấu này."));
    }

    private void ensureHost(BattleRoom room, User user) {
        if (!Objects.equals(room.getHostUser().getId(), user.getId())) {
            throw error(HttpStatus.FORBIDDEN, "Chỉ chủ phòng mới có thể bắt đầu trận đấu.");
        }
    }

    private String generateRoomCode() {
        for (int attempt = 0; attempt < 30; attempt++) {
            String code = String.format("%06d", 100000 + random.nextInt(900000));
            if (!roomRepository.existsByRoomCode(code)) return code;
        }
        throw error(HttpStatus.SERVICE_UNAVAILABLE, "Chưa thể tạo mã phòng, vui lòng thử lại.");
    }

    private String normalizeCode(String roomCode) {
        String normalized = roomCode == null ? "" : roomCode.trim();
        if (!normalized.matches("\\d{6}")) {
            throw error(HttpStatus.BAD_REQUEST, "Mã PIN phải gồm đúng 6 chữ số.");
        }
        return normalized;
    }

    private ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }

    private void broadcast(String roomCode, BattleDto.BattleEvent event) {
        messagingTemplate.convertAndSend("/topic/battle/" + roomCode, event);
    }

    private void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }

    private void scheduleClose(String roomCode, int questionIndex, LocalDateTime deadline) {
        schedule(roomCode, () -> closeQuestion(roomCode, questionIndex), deadline);
    }

    private void scheduleAdvance(String roomCode, int questionIndex, LocalDateTime when) {
        schedule(roomCode, () -> advanceBattle(roomCode, questionIndex), when);
    }

    private void schedule(String roomCode, Runnable task, LocalDateTime when) {
        Instant instant = toInstant(when);
        if (instant.isBefore(Instant.now())) instant = Instant.now();
        ScheduledFuture<?> future = battleTaskScheduler.schedule(task, instant);
        ScheduledFuture<?> previous = scheduledTransitions.put(roomCode, future);
        if (previous != null && !previous.isDone()) previous.cancel(false);
    }

    private Instant toInstant(LocalDateTime time) {
        return time.atZone(ZoneId.systemDefault()).toInstant();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void resumePlayingRooms() {
        roomRepository.findByStatus(BattleStatus.PLAYING).forEach(room -> {
            if (room.getQuestionDeadline() != null) {
                scheduleClose(room.getRoomCode(), room.getCurrentQuestionIndex(), room.getQuestionDeadline());
            } else {
                scheduleAdvance(room.getRoomCode(), room.getCurrentQuestionIndex(), LocalDateTime.now());
            }
        });
    }

    private record Transition(BattleDto.BattleEvent event, LocalDateTime when) {}
    private record Advance(BattleDto.BattleEvent event, LocalDateTime deadline, int questionIndex) {}
}
