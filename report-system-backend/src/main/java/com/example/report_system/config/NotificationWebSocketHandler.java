package com.example.report_system.config;

import com.example.report_system.entity.Users;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

@Component
public class NotificationWebSocketHandler extends TextWebSocketHandler {

    // userId → uning barcha ochiq sessionlari (bir user bir nechta tab ochishi mumkin)
    private final Map<Long, List<WebSocketSession>> userSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Long userId = getUserId(session);
        if (userId == null) {
            closeQuietly(session);
            return;
        }
        userSessions.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(session);
        //System.out.println("WS connected: userId=" + userId + " sessionId=" + session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Long userId = getUserId(session);
        if (userId != null) {
            List<WebSocketSession> sessions = userSessions.get(userId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) userSessions.remove(userId);
            }
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // Client ping — pong qaytaramiz (connection tirik ekanini tekshirish)
        if ("ping".equals(message.getPayload())) {
            sendToSession(session, "{\"type\":\"pong\"}");
        }
    }

    // ── User ga xabar yuborish ───────────────────────────────────────────────
    public void sendToUser(Long userId, String title, String body) {
        List<WebSocketSession> sessions = userSessions.get(userId);
        if (sessions == null || sessions.isEmpty()) return;

        String json = "{\"type\":\"notification\",\"title\":\"" + escape(title)
                + "\",\"body\":\"" + escape(body) + "\"}";

        for (WebSocketSession session : sessions) {
            sendToSession(session, json);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    private void sendToSession(WebSocketSession session, String message) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(message));
            }
        } catch (IOException e) {
            System.err.println("WS send xatosi: " + e.getMessage());
        }
    }

    private Long getUserId(WebSocketSession session) {
        try {
            Authentication auth = (Authentication) session.getPrincipal();
            if (auth == null) return null;
            Users user = (Users) auth.getPrincipal();
            return user.getId();
        } catch (Exception e) {
            return null;
        }
    }

    private void closeQuietly(WebSocketSession session) {
        try { session.close(); } catch (Exception ignored) {}
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }
}