package com.example.report_system.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;

import java.util.Locale;

@Configuration
public class LanguageConfig {

    @Bean
    public ResourceBundleMessageSource resourceBundleMessageSource(){
        ResourceBundleMessageSource message = new ResourceBundleMessageSource();
        message.setBasenames("messages/messages");
        message.setDefaultEncoding("UTF-8");
        message.setDefaultLocale(new Locale("uz"));

        return message;
    }
}

