package com.studentquizz.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studentquizz.dto.AiLearningDto;
import com.studentquizz.model.*;
import com.studentquizz.repository.QuizAttemptAnswerRepository;
import com.studentquizz.repository.QuizAttemptRepository;
import com.studentquizz.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GeminiLearningAssistantServiceTests {
    private final ObjectMapper mapper = new ObjectMapper();
    private UserRepository userRepository;
    private QuizAttemptRepository attemptRepository;
    private QuizAttemptAnswerRepository answerRepository;
    private GeminiLearningAssistantService service;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestTemplate restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        userRepository = mock(UserRepository.class);
        attemptRepository = mock(QuizAttemptRepository.class);
        answerRepository = mock(QuizAttemptAnswerRepository.class);
        service = new GeminiLearningAssistantService(
                restTemplate, mapper, userRepository, attemptRepository, answerRepository);
        ReflectionTestUtils.setField(service, "apiKey", "test-api-key");
        ReflectionTestUtils.setField(service, "configuredModels", "gemini-3.6-flash");
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void explainsEveryOptionAndNormalizesTrustedQuestionData() throws Exception {
        server.expect(once(), requestTo(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=test-api-key"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(geminiResponse(Map.of(
                        "overview", "Ta cần thực hiện phép cộng.",
                        "steps", List.of("Cộng hai đơn vị", "Đối chiếu đáp án"),
                        "optionAnalyses", List.of(
                                option(0, "sai 1"), option(1, "đúng"), option(2, "sai 2"), option(3, "sai 3")),
                        "studyTip", "Kiểm tra lại bằng phép trừ."
                )), MediaType.APPLICATION_JSON));

        AiLearningDto.ExplainQuestionRequest request = AiLearningDto.ExplainQuestionRequest.builder()
                .question("2 + 2 bằng bao nhiêu?")
                .options(List.of("3", "4", "5", "6"))
                .correctAnswer(1)
                .selectedAnswer(0)
                .build();
        AiLearningDto.ExplainQuestionResponse result = service.explainQuestion(request);

        assertEquals(4, result.getOptionAnalyses().size());
        assertEquals("4", result.getOptionAnalyses().get(1).getOptionText());
        assertTrue(result.getOptionAnalyses().get(1).getCorrect());
        assertTrue(result.getOptionAnalyses().get(0).getSelected());
        server.verify();
    }

    @Test
    void analyzesWrongAnswersAndGeneratesFiveReviewQuestions() throws Exception {
        User user = User.builder().id(42L).email("learner@test.local").name("Learner").password("x").build();
        Quiz quiz = Quiz.builder().id(7L).title("Đại số").category("Toán").build();
        QuizAttempt attempt = QuizAttempt.builder().id(9L).user(user).quiz(quiz).score(1).totalQuestions(2)
                .completedAt(LocalDateTime.now()).build();
        QuizAttemptAnswer wrong = QuizAttemptAnswer.builder().attempt(attempt).questionContent("2x=4")
                .selectedOptionText("x=1").correctOptionText("x=2").correct(false).build();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(attemptRepository.findTop20ByUserIdOrderByCompletedAtDesc(user.getId())).thenReturn(List.of(attempt));
        when(answerRepository.findRecentWrongAnswers(user.getId())).thenReturn(List.of(wrong));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user.getEmail(), "x", List.of()));

        Map<String, Object> review = Map.of(
                "content", "Nghiệm của 2x=6 là?",
                "options", List.of("1", "2", "3", "4"),
                "correctAnswer", 2,
                "explanation", "Chia hai vế cho 2.");
        server.expect(once(), requestTo(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=test-api-key"))
                .andRespond(withSuccess(geminiResponse(Map.of(
                        "strengths", List.of("Nhận biết phép toán cơ bản"),
                        "weaknesses", List.of(Map.of("topic", "Phương trình bậc nhất", "reason", "Chia hai vế chưa đúng", "priority", "HIGH")),
                        "recommendations", List.of("Ôn quy tắc chuyển vế", "Luyện phép chia", "Làm bài từ dễ đến khó"),
                        "reviewQuestions", List.of(review, review, review, review, review)
                )), MediaType.APPLICATION_JSON));

        AiLearningDto.WeaknessAnalysisResponse result = service.analyzeCurrentUserWeakness();
        assertEquals(1, result.getAnalyzedAttempts());
        assertEquals(1, result.getAnalyzedWrongAnswers());
        assertEquals(5, result.getReviewQuestions().size());
        assertFalse(result.getInsufficientData());
        server.verify();
    }

    private Map<String, Object> option(int index, String explanation) {
        return Map.of("optionIndex", index, "optionText", "untrusted", "correct", false,
                "selected", false, "explanation", explanation);
    }

    private String geminiResponse(Object structured) throws Exception {
        return mapper.writeValueAsString(Map.of(
                "candidates", List.of(Map.of(
                        "content", Map.of("parts", List.of(Map.of("text", mapper.writeValueAsString(structured)))),
                        "finishReason", "STOP"))));
    }
}
