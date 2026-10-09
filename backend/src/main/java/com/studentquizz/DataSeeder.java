package com.studentquizz;

import com.studentquizz.service.SampleDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final SampleDataService sampleDataService;

    @Override
    public void run(String... args) {
        var result = sampleDataService.seedSamplesIfMissing();
        log.info("✅ Seed hoàn tất — quiz mới: {}, forum mới: {}, demo: {}",
                result.get("quizzesCreated"), result.get("forumPostCreated"), SampleDataService.DEMO_EMAIL);
    }
}
