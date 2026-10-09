package com.studentquizz.dto;

import lombok.*;
import java.util.List;

@Data @Builder @AllArgsConstructor @NoArgsConstructor
public class QuestionDto {
    private Long id;
    private String content;
    private List<String> options;
    private Integer correctAnswer;
    private String explanation;
}
