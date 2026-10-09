package com.studentquizz.controller;

import com.studentquizz.dto.AiLearningDto;
import com.studentquizz.service.GeminiLearningAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiLearningController {
    private final GeminiLearningAssistantService assistantService;

    @PostMapping("/explain-question")
    public ResponseEntity<AiLearningDto.ExplainQuestionResponse> explainQuestion(
            @Valid @RequestBody AiLearningDto.ExplainQuestionRequest request) {
        return ResponseEntity.ok(assistantService.explainQuestion(request));
    }

    @PostMapping("/analyze-weakness")
    public ResponseEntity<AiLearningDto.WeaknessAnalysisResponse> analyzeWeakness() {
        return ResponseEntity.ok(assistantService.analyzeCurrentUserWeakness());
    }
}
