package com.studentquizz.dto;

import lombok.*;

@Data @Builder @AllArgsConstructor @NoArgsConstructor
public class QuizDto {
    private Long id;
    private String title;
    private String category;
    private String description;
    private Integer questionCount;
    private Long playCount;
    private Boolean featured;
    private String status;
    private String rejectReason;
    private String appealMessage;
    private AuthorDto author;
    private java.util.List<QuestionDto> questions;
    private String coverImage;
}

