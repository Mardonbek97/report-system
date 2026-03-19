// src/useNotifications.js
import { useEffect, useRef, useCallback } from "react";

const WS_URL = (import.meta.env.VITE_API_BASE || "http://localhost:8080")
  .replace("http://", "ws://")
  .replace("https://", "wss://");

export const useNotifications = (onMessage) => {
  const wsRef       = useRef(null);
  const pingRef     = useRef(null);
  const retryRef    = useRef(null);
  const mountedRef  = useRef(true);

  const connect = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token || !mountedRef.current) return;

    try {
      const ws = new WebSocket(`${WS_URL}/api/ws/notifications?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WS ulandi ✓");
        // Har 30 soniyada ping
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, 30_000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "notification") {
            onMessage(data);
            // Brauzer notification
            if (Notification.permission === "granted") {
              new Notification(data.title, { body: data.body, icon: "/favicon.ico" });
            }
          }
        } catch (e) {
          console.error("WS message parse xatosi:", e);
        }
      };

      ws.onclose = () => {
        clearInterval(pingRef.current);
        // 5 soniyadan keyin qayta ulanish
        if (mountedRef.current) {
          retryRef.current = setTimeout(connect, 5_000);
        }
      };

      ws.onerror = (err) => {
        console.error("WS xatosi:", err);
        ws.close();
      };

    } catch (e) {
      console.error("WS ulanish xatosi:", e);
    }
  }, [onMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearInterval(pingRef.current);
      clearTimeout(retryRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);
};