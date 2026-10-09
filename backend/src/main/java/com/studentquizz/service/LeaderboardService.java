package com.studentquizz.service;

import com.studentquizz.dto.LeaderboardDto;
import com.studentquizz.repository.QuizAttemptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaderboardService {

    private final QuizAttemptRepository quizAttemptRepository;

    public List<LeaderboardDto> getMostActive(int limit) {
        return quizAttemptRepository.getMostActiveUsers(PageRequest.of(0, limit));
    }

    public List<LeaderboardDto> getTopScoring(int limit) {
        return quizAttemptRepository.getTopScoringUsers(PageRequest.of(0, limit));
    }
}
