package com.studentquizz;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;

@Configuration
@Profile("prod")
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Value("${DATABASE_URL:}")
    private String rawDatabaseUrl;

    @Value("${DB_USERNAME:}")
    private String dbUsername;

    @Value("${DB_PASSWORD:}")
    private String dbPassword;

    @Bean
    public DataSource dataSource() {
        // Nếu DATABASE_URL trống → dùng H2 tạm để app không crash
        if (rawDatabaseUrl == null || rawDatabaseUrl.isBlank()) {
            log.warn("⚠️ DATABASE_URL chưa được cấu hình! Đang dùng H2 in-memory tạm thời.");
            HikariConfig fallbackConfig = new HikariConfig();
            fallbackConfig.setJdbcUrl("jdbc:h2:mem:fallbackdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL");
            fallbackConfig.setDriverClassName("org.h2.Driver");
            fallbackConfig.setUsername("sa");
            fallbackConfig.setPassword("");
            fallbackConfig.setPoolName("Fallback-H2-Pool");
            return new HikariDataSource(fallbackConfig);
        }

        // Loại bỏ khoảng trắng và dấu ngoặc kép (nếu user lỡ copy thừa)
        String cleanUrl = rawDatabaseUrl.trim().replaceAll("^\"|\"$", "").replaceAll("^'|'$", "");

        String jdbcUrl;
        String username = dbUsername;
        String password = dbPassword;

        if (cleanUrl.startsWith("postgres://") || cleanUrl.startsWith("postgresql://")) {
            String withoutScheme = cleanUrl.replaceFirst("^postgres(ql)?://", "");
            String[] atSplit = withoutScheme.split("@", 2);
            if (atSplit.length == 2) {
                String userInfo = atSplit[0];
                String hostAndDb = atSplit[1];
                String[] credParts = userInfo.split(":", 2);
                if (username.isBlank() && credParts.length >= 1) username = credParts[0];
                if (password.isBlank() && credParts.length >= 2) password = credParts[1];
                // Giữ nguyên query params, không append thêm nếu đã có ?
                jdbcUrl = "jdbc:postgresql://" + hostAndDb + (hostAndDb.contains("?") ? "" : "?sslmode=require");
            } else {
                jdbcUrl = "jdbc:postgresql://" + withoutScheme;
            }
        } else if (cleanUrl.startsWith("jdbc:postgresql://")) {
            jdbcUrl = cleanUrl;
        } else {
            log.error("❌ DATABASE_URL không hợp lệ: {}. Đang dùng H2 in-memory tạm thời.", cleanUrl.substring(0, Math.min(30, cleanUrl.length())));
            HikariConfig fallbackConfig = new HikariConfig();
            fallbackConfig.setJdbcUrl("jdbc:h2:mem:fallbackdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL");
            fallbackConfig.setDriverClassName("org.h2.Driver");
            fallbackConfig.setUsername("sa");
            fallbackConfig.setPassword("");
            fallbackConfig.setPoolName("Fallback-H2-Pool");
            return new HikariDataSource(fallbackConfig);
        }

        // Bỏ channel_binding=require vì gây lỗi xác thực với JDBC driver
        jdbcUrl = jdbcUrl
                .replaceAll("[&?]channel_binding=[^&]*", "")
                .replaceAll("\\?&", "?");   // sửa ?& thành ? nếu channel_binding ở đầu params

        log.info("✅ Connecting to PostgreSQL...");

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        if (!username.isBlank()) config.setUsername(username);
        if (!password.isBlank()) config.setPassword(password);
        config.setDriverClassName("org.postgresql.Driver");
        config.setMaximumPoolSize(3);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);
        config.setConnectionTestQuery("SELECT 1");
        config.setPoolName("StudentQuizz-PG-Pool");

        return new HikariDataSource(config);
    }
}
