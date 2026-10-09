package com.studentquizz.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "badges", uniqueConstraints = @UniqueConstraint(name = "uk_badges_code", columnNames = "code"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Badge {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 16)
    private String icon;
}
