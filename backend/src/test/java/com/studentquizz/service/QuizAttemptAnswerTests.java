package com.studentquizz.service;

import com.studentquizz.dto.QuizAttemptRequest;
import com.studentquizz.dto.QuizAttemptResponse;
import com.studentquizz.model.Question;
import com.studentquizz.model.Quiz;
import com.studentquizz.model.User;
import com.studentquizz.repository.QuizAttemptAnswerRepository;
import com.studentquizz.repository.QuizRepository;
import com.studentquizz.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class QuizAttemptAnswerTests {
    @Autowired private QuizService quizService;
    @Autowired private UserRepository userRepository;
    @Autowired private QuizRepository quizRepository;
    @Autowired private QuizAttemptAnswerRepository answerRepository;

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void storesQuestionDetailsAndCalculatesScoreOnServer() {
        long suffix = System.nanoTime();
        User user = userRepository.save(User.builder().name("Answer User")
                .email("answer-" + suffix + "@test.local").password("password").role("USER").build());
        Quiz quiz = Quiz.builder().title("Verified quiz " + suffix).category("Test").questionCount(2)
                .playCount(0L).featured(false).status("APPROVED").author(user).build();
        Question first = Question.builder().content("1 + 1?").options(List.of("1", "2", "3", "4"))
                .correctAnswer(1).quiz(quiz).build();
        Question second = Question.builder().content("2 + 2?").options(List.of("2", "3", "4", "5"))
                .correctAnswer(2).quiz(quiz).build();
        quiz.setQuestions(List.of(first, second));
        quiz = quizRepository.save(quiz);
        authenticate(user);

        QuizAttemptRequest request = QuizAttemptRequest.builder()
                .score(2)
                .totalQuestions(2)
                .answers(List.of(
                        new QuizAttemptRequest.AnswerInput(first.getId(), 1),
                        new QuizAttemptRequest.AnswerInput(second.getId(), 0)))
                .build();
        QuizAttemptResponse response = quizService.recordAttempt(quiz.getId(), request);

        assertEquals(1, response.getScore(), "Backend must ignore a spoofed score and grade submitted answers");
        var wrong = answerRepository.findRecentWrongAnswers(user.getId());
        assertEquals(1, wrong.size());
        assertEquals("2 + 2?", wrong.get(0).getQuestionContent());
        assertEquals("2", wrong.get(0).getSelectedOptionText());
        assertEquals("4", wrong.get(0).getCorrectOptionText());
    }

    private void authenticate(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user.getEmail(), "password", List.of()));
    }
}
