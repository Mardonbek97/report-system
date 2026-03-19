package com.example.report_system.service;

import com.example.report_system.config.NotificationWebSocketHandler;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final NotificationWebSocketHandler wsHandler;

    public NotificationService(NotificationWebSocketHandler wsHandler) {
        this.wsHandler = wsHandler;
    }

    public void notifySuccess(Long userId, String repName) {
        wsHandler.sendToUser(userId,
                "✅ Xisobot tayyor",
                repName + "!!!");
    }

    public void notifyError(Long userId, String repName, String error) {
        String shortError = error != null
                ? error.substring(0, Math.min(error.length(), 80))
                : "Noma'lum xatolik";
        wsHandler.sendToUser(userId,
                "❌ Xisobot xatosi",
                repName + ": " + shortError);
    }
}