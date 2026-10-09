package com.studentquizz.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BadgeResponse {
    private Long userBadgeId;
    private Long badgeId;
    private String code;
    private String name;
    private String description;
    private String icon;
    private LocalDateTime earnedAt;
    private Boolean seen;
}
