package com.studentquizz.service;

import com.studentquizz.dto.AuthorDto;
import com.studentquizz.dto.CreateQuizRequest;
import com.studentquizz.dto.QuestionDto;
import com.studentquizz.dto.QuizDto;
import com.studentquizz.model.Question;
import com.studentquizz.model.Quiz;
import com.studentquizz.model.User;
import com.studentquizz.model.QuizComment;
import com.studentquizz.model.QuizAttempt;
import com.studentquizz.repository.QuizCommentRepository;
import com.studentquizz.repository.QuizRepository;
import com.studentquizz.repository.UserRepository;
import com.studentquizz.repository.QuizAttemptRepository;
import com.studentquizz.dto.QuizAttemptResponse;
import com.studentquizz.dto.QuizAttemptRequest;
import com.studentquizz.model.QuizAttemptAnswer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class QuizService {

    private final QuizRepository quizRepository;
    private final UserRepository userRepository;
    private final DocumentParserService documentParserService;
    private final AiQuizGeneratorService aiQuizGeneratorService;
    private final QuizCommentRepository quizCommentRepository;
    private final NotificationService notificationService;
    private final QuizAttemptRepository quizAttemptRepository;
    private final AchievementService achievementService;
    private final CloudinaryService cloudinaryService;

    public List<QuizDto> getFeatured() {
        return quizRepository.findByFeaturedTrueAndStatusOrderByPlayCountDesc("APPROVED")
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public Page<QuizDto> getAll(int page, int size) {
        return quizRepository.findByStatusOrderByCreatedAtDesc("APPROVED", PageRequest.of(page, size))
                .map(this::toDto);
    }

    public QuizDto getById(Long id) {
        Quiz quiz = quizRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quiz not found: " + id));
        if (!"APPROVED".equals(quiz.getStatus()) && !canViewUnapproved(quiz)) {
            throw new RuntimeException("Quiz chưa được duyệt hoặc không khả dụng.");
        }
        return toDto(quiz);
    }

    @Transactional
    public QuizDto incrementPlayCount(Long id) {
        Quiz quiz = quizRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quiz not found: " + id));
        if (!"APPROVED".equals(quiz.getStatus())) {
            throw new RuntimeException("Chỉ có thể chơi quiz đã được duyệt.");
        }
        quiz.setPlayCount(quiz.getPlayCount() + 1);
        return toDto(quizRepository.save(quiz));
    }

    @Transactional
    public QuizDto create(CreateQuizRequest req, MultipartFile file, MultipartFile coverImageFile) {
        User author = getCurrentUser();
        int count = req.getQuestionCount() != null ? req.getQuestionCount() : 10;
        if (count < 1 || count > 50) {
            throw new RuntimeException("Số câu hỏi phải nằm trong khoảng từ 1 đến 50.");
        }
        String initialStatus = "ADMIN".equals(author.getRole()) ? "APPROVED" : "PENDING";

        // Upload ảnh bìa lên Cloudinary nếu có
        String coverImageUrl = null;
        if (coverImageFile != null && !coverImageFile.isEmpty()) {
            try {
                Map<String, String> uploadResult = cloudinaryService.upload(coverImageFile);
                coverImageUrl = uploadResult.get("url");
                log.info("🖼️ Đã upload ảnh bìa: {}", coverImageUrl);
            } catch (Exception e) {
                log.warn("Không thể upload ảnh bìa, bỏ qua: {}", e.getMessage());
            }
        }

        List<QuestionDto> questionsList;
        if (req.getQuestions() != null && !req.getQuestions().isEmpty()) {
            log.info("📝 Tạo quiz thủ công với {} câu hỏi...", req.getQuestions().size());
            questionsList = req.getQuestions();
        } else {
            // Parse tài liệu nếu có file
            String documentText = "";
            try {
                if (file != null && !file.isEmpty()) {
                    documentText = documentParserService.extractText(file);
                    if (documentText == null || documentText.isBlank()) {
                        throw new RuntimeException(
                                "Không đọc được chữ trong tài liệu. Nếu đây là PDF scan, vui lòng dùng file có thể chọn và sao chép văn bản.");
                    }
                    if (documentText.length() > 12000) {
                        documentText = documentText.substring(0, 12000);
                    }
                    log.info("📄 Đã đọc file: {} ký tự", documentText.length());
                }
            } catch (Exception e) {
                log.error("Lỗi khi đọc file: ", e);
                throw new RuntimeException("Không thể đọc file: " + e.getMessage());
            }

            // Gọi AI tạo câu hỏi
            questionsList = aiQuizGeneratorService.generateQuestions(documentText, count, req.getTitle());

            if (questionsList == null || questionsList.isEmpty()) {
                throw new RuntimeException("Không thể tạo câu hỏi từ AI. Vui lòng kiểm tra lại nội dung file hoặc thử lại sau.");
            }
        }

        // Lưu Quiz và các câu hỏi trong 1 giao dịch duy nhất
        Quiz quiz = Quiz.builder()
                .title(req.getTitle())
                .category(req.getCategory())
                .description(req.getDescription())
                .questionCount(questionsList.size())
                .author(author)
                .featured(false)
                .status(initialStatus)
                .coverImage(coverImageUrl)
                .build();

        Quiz finalQuiz = quiz;
        List<Question> questions = questionsList.stream().map(dto -> Question.builder()
                .quiz(finalQuiz)
                .content(dto.getContent())
                .options(dto.getOptions())
                .correctAnswer(dto.getCorrectAnswer())
                .explanation(dto.getExplanation())
                .build()).collect(Collectors.toList());

        quiz.setQuestions(questions);
        quiz = quizRepository.save(quiz);

        log.info("✅ Quiz '{}' đã được tạo với {} câu hỏi, status: {}", quiz.getTitle(), questions.size(), initialStatus);
        return toDto(quiz);
    }


    private User getCurrentUser() {
        return getCurrentUserOptional()
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Optional<User> getCurrentUserOptional() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return Optional.empty();
        }
        return userRepository.findByEmail(auth.getName());
    }

    private boolean canViewUnapproved(Quiz quiz) {
        return getCurrentUserOptional()
                .map(user -> quiz.getAuthor() != null && (
                        quiz.getAuthor().getId().equals(user.getId()) || "ADMIN".equals(user.getRole())))
                .orElse(false);
    }

    private QuizDto toDto(Quiz quiz) {
        AuthorDto authorDto = null;
        if (quiz.getAuthor() != null) {
            authorDto = AuthorDto.builder()
                    .id(quiz.getAuthor().getId())
                    .name(quiz.getAuthor().getName())
                    .avatar(quiz.getAuthor().getAvatar())
                    .build();
        }
        List<QuestionDto> qDtos = null;
        if (quiz.getQuestions() != null && !quiz.getQuestions().isEmpty()) {
            qDtos = quiz.getQuestions().stream().map(q -> QuestionDto.builder()
                    .id(q.getId())
                    .content(q.getContent())
                    .options(q.getOptions() != null ? new java.util.ArrayList<>(q.getOptions()) : new java.util.ArrayList<>())
                    .correctAnswer(q.getCorrectAnswer())
                    .explanation(q.getExplanation())
                    .build()).collect(Collectors.toList());
        }
        return QuizDto.builder()
                .id(quiz.getId())
                .title(quiz.getTitle())
                .category(quiz.getCategory())
                .description(quiz.getDescription())
                .questionCount(quiz.getQuestionCount())
                .playCount(quiz.getPlayCount())
                .featured(quiz.getFeatured())
                .status(quiz.getStatus())
                .rejectReason(quiz.getRejectReason())
                .appealMessage(quiz.getAppealMessage())
                .coverImage(quiz.getCoverImage())
                .author(authorDto)
                .questions(qDtos)
                .build();
    }

    @Transactional
    public QuizDto appeal(Long id, String message) {
        User author = getCurrentUser();
        Quiz quiz = quizRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quiz not found: " + id));

        if (!quiz.getAuthor().getId().equals(author.getId())) {
            throw new RuntimeException("Bạn không có quyền thực hiện hành động này.");
        }
        if (!"REJECTED".equals(quiz.getStatus())) {
            throw new RuntimeException("Chỉ có thể khiếu nại những bài bị từ chối.");
        }
        if (message == null || message.trim().isEmpty()) {
            throw new RuntimeException("Vui lòng nhập nội dung khiếu nại.");
        }

        quiz.setAppealMessage(message.trim());
        quiz.setStatus("PENDING");
        quiz.setRejectReason(null);
        return toDto(quizRepository.save(quiz));
    }

    @Transactional(readOnly = true)
    public List<com.studentquizz.dto.ForumDto.CommentResponse> getComments(Long quizId) {
        List<QuizComment> flat = quizCommentRepository.findByQuizIdOrderByCreatedAtAsc(quizId);
        java.util.Map<Long, com.studentquizz.dto.ForumDto.CommentResponse> dtoMap = new java.util.LinkedHashMap<>();
        List<com.studentquizz.dto.ForumDto.CommentResponse> roots = new java.util.ArrayList<>();

        for (QuizComment comment : flat) {
            com.studentquizz.dto.ForumDto.CommentResponse dto = toCommentDto(comment);
            dto.setReplies(new java.util.ArrayList<>());
            dtoMap.put(comment.getId(), dto);
        }

        for (QuizComment comment : flat) {
            com.studentquizz.dto.ForumDto.CommentResponse dto = dtoMap.get(comment.getId());
            if (comment.getParent() == null) {
                roots.add(dto);
            } else {
                com.studentquizz.dto.ForumDto.CommentResponse parentDto = dtoMap.get(comment.getParent().getId());
                if (parentDto != null) {
                    parentDto.getReplies().add(dto);
                } else {
                    roots.add(dto);
                }
            }
        }
        return roots;
    }

    @Transactional
    public com.studentquizz.dto.ForumDto.CommentResponse addComment(Long quizId, com.studentquizz.dto.ForumDto.CreateCommentRequest req) {
        User author = getCurrentUser();
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new RuntimeException("Quiz not found"));
        if (!"APPROVED".equals(quiz.getStatus())) {
            throw new RuntimeException("Chỉ có thể bình luận quiz đã được duyệt.");
        }
        if (req.getContent() == null || req.getContent().trim().isEmpty()) {
            throw new RuntimeException("Nội dung bình luận không được để trống.");
        }

        QuizComment parent = null;
        if (req.getParentId() != null) {
            parent = quizCommentRepository.findById(req.getParentId())
                    .orElseThrow(() -> new RuntimeException("Bình luận không tồn tại."));
            if (!parent.getQuiz().getId().equals(quizId)) {
                throw new RuntimeException("Bình luận không thuộc quiz này.");
            }
        }

        QuizComment comment = QuizComment.builder()
                .content(req.getContent().trim())
                .author(author)
                .quiz(quiz)
                .parent(parent)
                .build();
        comment = quizCommentRepository.save(comment);

        // Send notifications for Quiz Comments / Replies
        if (parent == null) {
            notificationService.createNotification(
                quiz.getAuthor(),
                author,
                "QUIZ_COMMENT",
                null,
                quiz.getId(),
                String.format("%s đã bình luận về bài quiz của bạn: \"%s\"", author.getName(), quiz.getTitle())
            );
        } else {
            // Notify the parent comment author
            notificationService.createNotification(
                parent.getAuthor(),
                author,
                "QUIZ_REPLY",
                null,
                quiz.getId(),
                String.format("%s đã phản hồi bình luận của bạn trong bài quiz: \"%s\"", author.getName(), quiz.getTitle())
            );
            // Notify the quiz author as well (if different from parent comment author)
            if (quiz.getAuthor() != null && parent.getAuthor() != null &&
                !quiz.getAuthor().getId().equals(parent.getAuthor().getId())) {
                notificationService.createNotification(
                    quiz.getAuthor(),
                    author,
                    "QUIZ_COMMENT",
                    null,
                    quiz.getId(),
                    String.format("%s đã bình luận về bài quiz của bạn: \"%s\"", author.getName(), quiz.getTitle())
                );
            }
        }

        return toCommentDto(comment);
    }

    private com.studentquizz.dto.ForumDto.CommentResponse toCommentDto(QuizComment c) {
        String replyTo = null;
        Long parentId = null;
        if (c.getParent() != null) {
            parentId = c.getParent().getId();
            if (c.getParent().getAuthor() != null) {
                replyTo = c.getParent().getAuthor().getName();
            }
        }
        return com.studentquizz.dto.ForumDto.CommentResponse.builder()
                .id(c.getId())
                .content(c.getContent())
                .author(toAuthorDto(c.getAuthor()))
                .likeCount(c.getLikeCount())
                .createdAt(c.getCreatedAt())
                .parentId(parentId)
                .replyToAuthorName(replyTo)
                .replies(new java.util.ArrayList<>())
                .build();
    }

    private AuthorDto toAuthorDto(User user) {
        if (user == null) return null;
        return AuthorDto.builder()
                .id(user.getId())
                .name(user.getName())
                .avatar(user.getAvatar())
                .build();
    }

    @Transactional
    public QuizAttemptResponse recordAttempt(Long quizId, int score, int totalQuestions) {
        return recordAttempt(quizId, QuizAttemptRequest.builder()
                .score(score)
                .totalQuestions(totalQuestions)
                .answers(new ArrayList<>())
                .build());
    }

    @Transactional
    public QuizAttemptResponse recordAttempt(Long quizId, QuizAttemptRequest request) {
        User user = getCurrentUser();
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new RuntimeException("Quiz not found: " + quizId));

        int score = request.getScore();
        int totalQuestions = request.getTotalQuestions();

        if (totalQuestions <= 0 || score < 0 || score > totalQuestions) {
            throw new IllegalArgumentException("Kết quả bài quiz không hợp lệ.");
        }
        if (quiz.getQuestionCount() != null && quiz.getQuestionCount() > 0
                && !quiz.getQuestionCount().equals(totalQuestions)) {
            throw new IllegalArgumentException("Số câu hỏi không khớp với bài quiz.");
        }

        List<QuizAttemptRequest.AnswerInput> submittedAnswers = request.getAnswers() == null
                ? List.of() : request.getAnswers();
        List<QuizAttemptAnswer> answerDetails = new ArrayList<>();
        if (!submittedAnswers.isEmpty()) {
            List<Question> quizQuestions = quiz.getQuestions() == null ? List.of() : quiz.getQuestions();
            if (quizQuestions.isEmpty() || submittedAnswers.size() != quizQuestions.size()) {
                throw new IllegalArgumentException("Chi tiết câu trả lời không đầy đủ.");
            }
            Map<Long, Question> questionsById = new HashMap<>();
            for (Question question : quizQuestions) questionsById.put(question.getId(), question);
            Set<Long> seenQuestionIds = new HashSet<>();
            int verifiedScore = 0;
            for (QuizAttemptRequest.AnswerInput input : submittedAnswers) {
                Question question = questionsById.get(input.getQuestionId());
                if (question == null || !seenQuestionIds.add(input.getQuestionId())) {
                    throw new IllegalArgumentException("Câu trả lời không thuộc bài quiz hoặc bị trùng.");
                }
                Integer selected = input.getSelectedAnswer();
                if (selected != null && (selected < 0 || selected >= question.getOptions().size())) {
                    throw new IllegalArgumentException("Lựa chọn câu trả lời không hợp lệ.");
                }
                boolean correct = selected != null && selected.equals(question.getCorrectAnswer());
                if (correct) verifiedScore++;
                answerDetails.add(QuizAttemptAnswer.builder()
                        .questionId(question.getId())
                        .questionContent(question.getContent())
                        .selectedAnswer(selected)
                        .correctAnswer(question.getCorrectAnswer())
                        .selectedOptionText(selected == null ? null : question.getOptions().get(selected))
                        .correctOptionText(question.getOptions().get(question.getCorrectAnswer()))
                        .correct(correct)
                        .build());
            }
            score = verifiedScore;
            totalQuestions = quizQuestions.size();
        }

        QuizAttempt attempt = QuizAttempt.builder()
                .user(user)
                .quiz(quiz)
                .score(score)
                .totalQuestions(totalQuestions)
                .build();

        for (QuizAttemptAnswer detail : answerDetails) detail.setAttempt(attempt);
        attempt.setAnswers(answerDetails);

        attempt = quizAttemptRepository.save(attempt);

        // Increment play count
        quiz.setPlayCount(quiz.getPlayCount() + 1);

        achievementService.recordQuizActivity(user.getId(), attempt);

        return toAttemptResponse(attempt);
    }

    public List<QuizAttemptResponse> getMyAttempts() {
        User user = getCurrentUser();
        return quizAttemptRepository.findByUserIdOrderByCompletedAtDesc(user.getId())
                .stream()
                .map(this::toAttemptResponse)
                .collect(Collectors.toList());
    }

    private QuizAttemptResponse toAttemptResponse(QuizAttempt attempt) {
        return QuizAttemptResponse.builder()
                .id(attempt.getId())
                .quizId(attempt.getQuiz().getId())
                .quizTitle(attempt.getQuiz().getTitle())
                .quizCategory(attempt.getQuiz().getCategory())
                .score(attempt.getScore())
                .totalQuestions(attempt.getTotalQuestions())
                .completedAt(attempt.getCompletedAt())
                .build();
    }
}
