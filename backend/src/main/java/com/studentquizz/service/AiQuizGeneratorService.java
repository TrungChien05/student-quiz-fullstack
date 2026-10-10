package com.studentquizz.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studentquizz.dto.QuestionDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AiQuizGeneratorService {

    private static final String[] BASE_URL_TEMPLATES = {
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent",
            "https://generativelanguage.googleapis.com/v1/models/%s:generateContent"
    };

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.models:gemini-flash-lite-latest,gemini-flash-latest,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.5-flash,gemini-pro-latest}")
    private String configuredModels;

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper;

    @Autowired
    public AiQuizGeneratorService(RestTemplateBuilder restTemplateBuilder, ObjectMapper mapper) {
        this(restTemplateBuilder
                .connectTimeout(Duration.ofSeconds(10))
                .readTimeout(Duration.ofSeconds(90))
                .build(), mapper);
    }

    AiQuizGeneratorService(RestTemplate restTemplate, ObjectMapper mapper) {
        this.restTemplate = restTemplate;
        this.mapper = mapper;
    }

    private String getSanitizedApiKey() {
        if (apiKey == null) return "";
        String key = apiKey.trim();
        if (key.startsWith("\"") && key.endsWith("\"") && key.length() > 2) {
            key = key.substring(1, key.length() - 1).trim();
        }
        if (key.startsWith("'") && key.endsWith("'") && key.length() > 2) {
            key = key.substring(1, key.length() - 1).trim();
        }
        return key;
    }

    public List<QuestionDto> generateQuestions(String text, int questionCount, String title) {
        String cleanKey = getSanitizedApiKey();
        if (cleanKey.isBlank() || "YOUR_API_KEY".equals(cleanKey)) {
            throw new RuntimeException(
                    "Chức năng AI chưa được cấu hình. Vui lòng thiết lập GEMINI_API_KEY trên Render.");
        }

        if (questionCount < 1 || questionCount > 50) {
            throw new RuntimeException("Số câu hỏi AI phải nằm trong khoảng từ 1 đến 50.");
        }

        String prompt = buildPrompt(text, questionCount, title);
        String lastFailure = "Nhà cung cấp AI hiện không phản hồi.";

        for (String model : getModels()) {
            for (String urlTemplate : BASE_URL_TEMPLATES) {
                try {
                    log.info("Đang gọi Gemini model {} qua {}", model, urlTemplate);
                    List<QuestionDto> questions = callGeminiWithFallback(model, urlTemplate, prompt, questionCount, cleanKey);
                    validateQuestions(questions, questionCount);
                    log.info("Model {} đã tạo thành công {} câu hỏi", model, questions.size());
                    return questions;
                } catch (RestClientResponseException ex) {
                    lastFailure = describeProviderError(ex);
                    log.warn("Gemini model {} ({}) trả về HTTP {}: {}", model, urlTemplate, ex.getStatusCode().value(), lastFailure);

                    String body = ex.getResponseBodyAsString();
                    boolean isHtml403 = ex.getStatusCode().value() == 403 && body != null && body.trim().startsWith("<");
                    if (ex.getStatusCode().value() == 401 || (ex.getStatusCode().value() == 403 && !isHtml403)) {
                        throw new RuntimeException("Không thể tạo quiz bằng AI. " + lastFailure);
                    }
                } catch (RestClientException ex) {
                    lastFailure = "Không thể kết nối tới Gemini. Vui lòng thử lại sau.";
                    log.warn("Không thể kết nối Gemini model {}: {}", model, ex.getMessage());
                } catch (Exception ex) {
                    lastFailure = ex.getMessage() != null ? ex.getMessage() : "Gemini trả về dữ liệu không hợp lệ.";
                    log.warn("Gemini model {} lỗi xử lý: {}", model, lastFailure);
                }
            }
        }

        throw new RuntimeException("Không thể tạo quiz bằng AI. " + lastFailure);
    }

    private List<String> getModels() {
        List<String> models = new ArrayList<>();
        if (configuredModels != null) {
            for (String value : configuredModels.split(",")) {
                String model = value.trim();
                if (model.startsWith("models/")) {
                    model = model.substring("models/".length());
                }
                if (!model.isBlank() && !models.contains(model)) {
                    models.add(model);
                }
            }
        }
        if (models.isEmpty()) {
            throw new RuntimeException("Danh sách model Gemini chưa được cấu hình.");
        }
        return models;
    }

    private List<QuestionDto> callGeminiWithFallback(
            String model, String urlTemplate, String prompt, int questionCount, String cleanKey) throws Exception {
        // Chiến lược 1: Dùng responseSchema (structured output)
        try {
            return executeGeminiCall(model, urlTemplate, prompt, questionCount, cleanKey, true);
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 400 || ex.getStatusCode().value() == 404) {
                log.info("Thử lại model {} mà không dùng responseSchema...", model);
                // Chiến lược 2: Dùng responseMimeType="application/json" thuần túy
                return executeGeminiCall(model, urlTemplate, prompt, questionCount, cleanKey, false);
            }
            throw ex;
        }
    }

    private List<QuestionDto> executeGeminiCall(
            String model, String urlTemplate, String prompt, int questionCount, String cleanKey, boolean useSchema) throws Exception {
        String url = String.format(urlTemplate, model) + "?key=" + cleanKey;

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("maxOutputTokens", calculateMaxOutputTokens(questionCount));
        generationConfig.put("responseMimeType", "application/json");
        if (useSchema) {
            generationConfig.put("responseSchema", buildQuestionSchema());
        }

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt))
                )),
                "generationConfig", generationConfig
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", cleanKey);

        ResponseEntity<String> response = restTemplate.postForEntity(
                url,
                new HttpEntity<>(requestBody, headers),
                String.class
        );

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Gemini không trả về nội dung.");
        }

        return parseQuestions(extractTextFromResponse(response.getBody()));
    }

    private Map<String, Object> buildQuestionSchema() {
        Map<String, Object> questionProperties = Map.of(
                "content", Map.of(
                        "type", "STRING",
                        "description", "Nội dung câu hỏi trắc nghiệm bằng tiếng Việt"
                ),
                "options", Map.of(
                        "type", "ARRAY",
                        "description", "Bốn phương án trả lời, không thêm tiền tố A/B/C/D",
                        "items", Map.of("type", "STRING")
                ),
                "correctAnswer", Map.of(
                        "type", "INTEGER",
                        "description", "Vị trí đáp án đúng, từ 0 đến 3"
                ),
                "explanation", Map.of(
                        "type", "STRING",
                        "description", "Giải thích ngắn gọn vì sao đáp án đúng"
                )
        );

        return Map.of(
                "type", "ARRAY",
                "items", Map.of(
                        "type", "OBJECT",
                        "properties", questionProperties,
                        "required", List.of("content", "options", "correctAnswer", "explanation")
                )
        );
    }

    private int calculateMaxOutputTokens(int questionCount) {
        return Math.min(32768, Math.max(4096, questionCount * 500));
    }

    private String buildPrompt(String text, int count, String title) {
        String safeTitle = title == null || title.isBlank() ? "Kiến thức tổng hợp" : title.trim();
        String context = text != null && !text.isBlank()
                ? "Chỉ sử dụng nội dung tài liệu sau làm nguồn kiến thức:\n\n"
                    + text.substring(0, Math.min(text.length(), 10000))
                : "Chủ đề của bài quiz: " + safeTitle;

        return String.format("""
                %s

                Hãy tạo đúng %d câu hỏi trắc nghiệm bằng tiếng Việt.
                Mỗi câu có đúng 4 phương án, chỉ có một đáp án đúng và có giải thích ngắn gọn.
                Các câu hỏi không được trùng nhau và phải phù hợp với chủ đề hoặc tài liệu.
                correctAnswer là vị trí đáp án đúng: 0, 1, 2 hoặc 3.
                Chỉ trả về dữ liệu theo JSON schema được yêu cầu.
                """, context, count);
    }

    private String extractTextFromResponse(String responseBody) throws Exception {
        JsonNode root = mapper.readTree(responseBody);
        JsonNode candidates = root.path("candidates");
        if (candidates.isEmpty()) {
            String blockReason = root.path("promptFeedback").path("blockReason").asText();
            if (!blockReason.isBlank()) {
                throw new RuntimeException("Gemini từ chối nội dung này (" + blockReason + ").");
            }
            throw new RuntimeException("Gemini không trả về câu hỏi.");
        }

        JsonNode parts = candidates.get(0).path("content").path("parts");
        if (parts.isEmpty() || parts.get(0).path("text").asText().isBlank()) {
            String finishReason = candidates.get(0).path("finishReason").asText();
            throw new RuntimeException(finishReason.isBlank()
                    ? "Gemini trả về nội dung rỗng."
                    : "Gemini dừng tạo nội dung: " + finishReason + ".");
        }
        return parts.get(0).path("text").asText();
    }

    private List<QuestionDto> parseQuestions(String raw) throws Exception {
        String cleaned = raw.trim()
                .replaceFirst("(?s)^```(?:json)?\\s*", "")
                .replaceFirst("(?s)\\s*```$", "")
                .trim();

        try {
            return mapper.readValue(cleaned, new TypeReference<List<QuestionDto>>() {});
        } catch (Exception firstError) {
            int start = raw.indexOf('[');
            int end = raw.lastIndexOf(']');
            if (start >= 0 && end > start) {
                return mapper.readValue(raw.substring(start, end + 1),
                        new TypeReference<List<QuestionDto>>() {});
            }
            throw new RuntimeException("Gemini trả về JSON không hợp lệ.", firstError);
        }
    }

    private void validateQuestions(List<QuestionDto> questions, int expectedCount) {
        if (questions == null || questions.size() != expectedCount) {
            int actualCount = questions == null ? 0 : questions.size();
            throw new RuntimeException(
                    "Gemini tạo không đủ câu hỏi (cần " + expectedCount + ", nhận " + actualCount + ").");
        }

        for (int i = 0; i < questions.size(); i++) {
            QuestionDto question = questions.get(i);
            if (question == null || question.getContent() == null || question.getContent().isBlank()) {
                throw new RuntimeException("Câu hỏi AI số " + (i + 1) + " không có nội dung.");
            }
            if (question.getOptions() == null || question.getOptions().size() != 4
                    || question.getOptions().stream().anyMatch(option -> option == null || option.isBlank())) {
                throw new RuntimeException("Câu hỏi AI số " + (i + 1) + " không có đủ 4 đáp án.");
            }
            if (question.getCorrectAnswer() == null
                    || question.getCorrectAnswer() < 0
                    || question.getCorrectAnswer() > 3) {
                throw new RuntimeException("Câu hỏi AI số " + (i + 1) + " có đáp án đúng không hợp lệ.");
            }

            question.setContent(question.getContent().trim());
            question.setOptions(question.getOptions().stream().map(String::trim).toList());
            question.setExplanation(question.getExplanation() == null ? "" : question.getExplanation().trim());
        }
    }

    private String describeProviderError(RestClientResponseException ex) {
        int status = ex.getStatusCode().value();
        String responseBody = ex.getResponseBodyAsString();
        log.error("Google Gemini API error (status {}): {}", status, responseBody);

        String detailMessage = "";
        try {
            if (responseBody != null && !responseBody.isBlank()) {
                JsonNode root = mapper.readTree(responseBody);
                String msg = root.path("error").path("message").asText();
                if (msg != null && !msg.isBlank()) {
                    detailMessage = " (" + msg + ")";
                }
            }
        } catch (Exception ignored) {}

        return switch (status) {
            case 400 -> "Yêu cầu gửi tới Gemini không hợp lệ" + detailMessage + ".";
            case 401, 403 -> "GEMINI_API_KEY không hợp lệ hoặc bị từ chối" + detailMessage + ".";
            case 404 -> "Không tìm thấy model Gemini" + detailMessage + ".";
            case 429 -> "Gemini đã hết hạn mức hoặc vượt giới hạn lượt gọi" + detailMessage + ".";
            default -> status >= 500
                    ? "Dịch vụ Gemini đang tạm thời gặp sự cố" + detailMessage + "."
                    : "Gemini trả về lỗi HTTP " + status + detailMessage + ".";
        };
    }
}
