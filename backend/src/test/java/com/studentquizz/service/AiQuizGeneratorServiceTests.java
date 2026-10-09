package com.studentquizz.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studentquizz.dto.QuestionDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AiQuizGeneratorServiceTests {

    private AiQuizGeneratorService service;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestTemplate restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        service = new AiQuizGeneratorService(restTemplate, new ObjectMapper());
        ReflectionTestUtils.setField(service, "apiKey", "test-api-key");
        ReflectionTestUtils.setField(service, "configuredModels", "gemini-3.6-flash");
    }

    @Test
    void generatesAndValidatesStructuredQuestions() {
        server.expect(once(), requestTo(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=test-api-key"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("x-goog-api-key", "test-api-key"))
                .andExpect(jsonPath("$.generationConfig.responseMimeType")
                        .value("application/json"))
                .andExpect(jsonPath("$.generationConfig.responseSchema.type")
                        .value("ARRAY"))
                .andRespond(withSuccess(successResponse(), MediaType.APPLICATION_JSON));

        List<QuestionDto> questions = service.generateQuestions("", 1, "Toán học");

        assertEquals(1, questions.size());
        assertEquals("2 + 2 bằng bao nhiêu?", questions.get(0).getContent());
        assertEquals(4, questions.get(0).getOptions().size());
        assertEquals(1, questions.get(0).getCorrectAnswer());
        server.verify();
    }

    @Test
    void fallsBackWhenTheFirstModelIsUnavailable() {
        ReflectionTestUtils.setField(
                service,
                "configuredModels",
                "gemini-3.6-flash,gemini-flash-latest"
        );

        // Model 1 (v1beta with schema): 404
        server.expect(once(), requestTo(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=test-api-key"))
                .andRespond(withResourceNotFound());
        // Model 1 (v1beta without schema retry): 404
        server.expect(once(), requestTo(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=test-api-key"))
                .andRespond(withResourceNotFound());
        // Model 1 (v1 with schema): 404
        server.expect(once(), requestTo(
                        "https://generativelanguage.googleapis.com/v1/models/gemini-3.6-flash:generateContent?key=test-api-key"))
                .andRespond(withResourceNotFound());
        // Model 1 (v1 without schema retry): 404
        server.expect(once(), requestTo(
                        "https://generativelanguage.googleapis.com/v1/models/gemini-3.6-flash:generateContent?key=test-api-key"))
                .andRespond(withResourceNotFound());

        // Model 2 (v1beta with schema): Success
        server.expect(once(), requestTo(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=test-api-key"))
                .andRespond(withSuccess(successResponse(), MediaType.APPLICATION_JSON));

        List<QuestionDto> questions = service.generateQuestions("", 1, "Toán học");

        assertEquals(1, questions.size());
        server.verify();
    }

    @Test
    void reportsMissingApiKeyInsteadOfCreatingFakeQuestions() {
        ReflectionTestUtils.setField(service, "apiKey", "");

        RuntimeException error = assertThrows(
                RuntimeException.class,
                () -> service.generateQuestions("", 1, "Toán học")
        );

        assertTrue(error.getMessage().contains("GEMINI_API_KEY"));
    }

    private String successResponse() {
        return """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "[{\\\"content\\\":\\\"2 + 2 bằng bao nhiêu?\\\",\\\"options\\\":[\\\"3\\\",\\\"4\\\",\\\"5\\\",\\\"6\\\"],\\\"correctAnswer\\\":1,\\\"explanation\\\":\\\"2 + 2 = 4.\\\"}]"
                          }
                        ]
                      },
                      "finishReason": "STOP"
                    }
                  ]
                }
                """;
    }
}
