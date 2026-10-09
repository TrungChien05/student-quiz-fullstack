package com.studentquizz.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaderboardDto {
    private Long userId;
    private String name;
    private String avatar;
    private Long value; // Attempts count or total score
}
