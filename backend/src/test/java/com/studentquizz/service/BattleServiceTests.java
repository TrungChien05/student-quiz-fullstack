package com.studentquizz.service;

import com.studentquizz.dto.BattleDto;
import com.studentquizz.model.*;
import com.studentquizz.repository.BattleParticipantRepository;
import com.studentquizz.repository.QuizRepository;
import com.studentquizz.repository.UserRepository;
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
class BattleServiceTests {

    @Autowired
    private BattleService battleService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QuizRepository quizRepository;

    @Autowired
    private BattleParticipantRepository participantRepository;

    @Test
    void createsJoinsStartsAndScoresBattleOnTheServer() {
        User host = userRepository.save(User.builder()
                .name("Battle Host")
                .email("battle-host-" + System.nanoTime() + "@test.local")
                .password("password")
                .role("USER")
                .locked(false)
                .build());
        User guest = userRepository.save(User.builder()
                .name("Battle Guest")
                .email("battle-guest-" + System.nanoTime() + "@test.local")
                .password("password")
                .role("USER")
                .locked(false)
                .build());

        Quiz quiz = Quiz.builder()
                .title("Battle Quiz " + System.nanoTime())
                .category("Khác")
                .description("Quiz integration test")
                .questionCount(1)
                .playCount(0L)
                .featured(false)
                .author(host)
                .status("APPROVED")
                .build();
        Question question = Question.builder()
                .content("2 + 2 bằng bao nhiêu?")
                .options(List.of("3", "4", "5", "6"))
                .correctAnswer(1)
                .explanation("2 + 2 = 4")
                .quiz(quiz)
                .build();
        quiz.setQuestions(List.of(question));
        quiz = quizRepository.save(quiz);

        authenticate(host);
        BattleDto.RoomResponse created = battleService.createRoom(quiz.getId());
        assertTrue(created.getRoomCode().matches("\\d{6}"));
        assertEquals(BattleStatus.WAITING, created.getStatus());
        assertEquals(1, created.getParticipants().size());
        assertTrue(created.getParticipants().get(0).getIsHost());

        authenticate(guest);
        BattleDto.RoomResponse joined = battleService.joinRoom(created.getRoomCode());
        assertEquals(2, joined.getParticipants().size());
        assertThrows(ResponseStatusException.class,
                () -> battleService.startBattle(created.getRoomCode()));

        authenticate(host);
        BattleDto.RoomResponse playing = battleService.startBattle(created.getRoomCode());
        assertEquals(BattleStatus.PLAYING, playing.getStatus());
        assertNotNull(playing.getCurrentQuestion());
        assertEquals(4, playing.getCurrentQuestion().getOptions().size());

        authenticate(guest);
        BattleDto.AnswerRequest answer = new BattleDto.AnswerRequest();
        answer.setQuestionIndex(0);
        answer.setAnswerIndex(1);
        answer.setResponseTimeMs(1L);
        BattleDto.AnswerResponse accepted = battleService.submitAnswer(created.getRoomCode(), answer);
        assertTrue(accepted.getAccepted());

        BattleRoom room = participantRepository.findAll().stream()
                .map(BattleParticipant::getRoom)
                .filter(candidate -> candidate.getRoomCode().equals(created.getRoomCode()))
                .findFirst().orElseThrow();
        BattleParticipant scoredGuest = participantRepository.findByRoomAndUser(room, guest).orElseThrow();
        assertTrue(scoredGuest.getScore() >= 500 && scoredGuest.getScore() <= 1000);
        assertThrows(ResponseStatusException.class,
                () -> battleService.submitAnswer(created.getRoomCode(), answer));

        SecurityContextHolder.clearContext();
    }

    private void authenticate(User user) {
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        org.springframework.security.core.userdetails.User principal =
                new org.springframework.security.core.userdetails.User(user.getEmail(), "", authorities);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, authorities));
    }
}
