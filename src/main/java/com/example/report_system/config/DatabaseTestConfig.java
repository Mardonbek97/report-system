package com.example.report_system.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.sql.Connection;

@Configuration
public class DatabaseTestConfig {

    @Bean
    CommandLineRunner testOracleConnection(DataSource dataSource) {
        return args -> {
            try (Connection connection = dataSource.getConnection()) {
                System.out.println("✅ Oracle Database ulanish muvaffaqiyatli!");
                System.out.println("Database: " + connection.getMetaData().getDatabaseProductName());
                System.out.println("Version: " + connection.getMetaData().getDatabaseProductVersion());
                System.out.println("URL: " + connection.getMetaData().getURL());
            } catch (Exception e) {
                System.err.println("❌ Oracle ulanishda xatolik: " + e.getMessage());
                e.printStackTrace();
            }
        };
    }
}