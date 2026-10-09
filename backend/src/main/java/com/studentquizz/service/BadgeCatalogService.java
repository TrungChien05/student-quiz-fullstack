package com.studentquizz.service;

import com.studentquizz.model.Badge;
import com.studentquizz.repository.BadgeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Order(10)
public class BadgeCatalogService implements ApplicationRunner {
    public static final String ROOKIE = "ROOKIE";
    public static final String STREAK_7 = "STREAK_7";
    public static final String PERFECT_10 = "PERFECT_10";
    public static final String FORUM_WRITER_5 = "FORUM_WRITER_5";

    private static final List<Definition> DEFINITIONS = List.of(
            new Definition(ROOKIE, "Tân binh", "Hoàn thành bài quiz đầu tiên.", "🌱"),
            new Definition(STREAK_7, "Chăm chỉ 7 ngày", "Học và hoàn thành quiz liên tục trong 7 ngày.", "🔥"),
            new Definition(PERFECT_10, "Bách phát bách trúng", "Đạt điểm tuyệt đối 10/10 trong một bài quiz.", "🎯"),
            new Definition(FORUM_WRITER_5, "Cây viết vàng", "Đăng đủ 5 bài viết trên diễn đàn.", "✍️")
    );

    private final BadgeRepository badgeRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (Definition definition : DEFINITIONS) {
            Badge badge = badgeRepository.findByCode(definition.code())
                    .orElseGet(() -> Badge.builder().code(definition.code()).build());
            badge.setName(definition.name());
            badge.setDescription(definition.description());
            badge.setIcon(definition.icon());
            badgeRepository.save(badge);
        }
    }

    private record Definition(String code, String name, String description, String icon) {}
}
