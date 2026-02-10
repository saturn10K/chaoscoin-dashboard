"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://chaoscoin-production.up.railway.app";

interface TickerMessage {
  id: string;
  agentEmoji: string;
  agentTitle: string;
  text: string;
  type: string;
}

interface StatusTickerProps {
  statusText: string;
  statusColor: string;
}

const TYPE_DOTS: Record<string, string> = {
  taunt: "#FF6B6B",
  boast: "#FFD93D",
  threat: "#FF4444",
  shitpost: "#00D4FF",
  reply: "#4A90D9",
  observation: "#7B61FF",
  flex: "#FFD700",
  zone_pride: "#48BB78",
  grudge_post: "#E53E3E",
  conspiracy: "#9B59B6",
  lament: "#6C757D",
  paranoid_rant: "#9B59B6",
  self_deprecation: "#718096",
  philosophy: "#A0AEC0",
};

export default function StatusTicker({ statusText, statusColor }: StatusTickerProps) {
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const cycleCountRef = useRef(0);

  // Fetch recent social messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/social/feed?count=10`);
      if (!res.ok) return;
      const data = await res.json();
      const msgs = (data.messages || []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        agentEmoji: m.agentEmoji as string || "",
        agentTitle: m.agentTitle as string || "Agent",
        text: m.text as string || "",
        type: m.type as string || "observation",
      }));
      if (msgs.length > 0) setMessages(msgs);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 12_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Cycle through items
  useEffect(() => {
    if (messages.length === 0) return;

    const timer = setInterval(() => {
      // Fade out
      setIsVisible(false);

      setTimeout(() => {
        cycleCountRef.current += 1;

        // Show status line every 4th cycle
        if (cycleCountRef.current % 5 === 0) {
          setCurrentIndex(-1); // -1 = show status
        } else {
          setCurrentIndex((prev) => {
            const next = prev === -1 ? 0 : prev + 1;
            return next >= messages.length ? 0 : next;
          });
        }

        // Fade in
        setIsVisible(true);
      }, 300);
    }, 4500);

    return () => clearInterval(timer);
  }, [messages.length]);

  // Build current display
  const isShowingStatus = currentIndex === -1 || messages.length === 0;

  return (
    <>
      <style>{`
        .ticker-fade {
          transition: opacity 0.3s ease-in-out;
        }
        .ticker-fade-out {
          opacity: 0;
        }
        .ticker-fade-in {
          opacity: 1;
        }
        @keyframes tickerSlideIn {
          from { transform: translateY(4px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .ticker-slide-in {
          animation: tickerSlideIn 0.3s ease-out;
        }
      `}</style>
      <div className="relative overflow-hidden" style={{ height: 20 }}>
        <div
          className={`ticker-fade ${isVisible ? "ticker-fade-in ticker-slide-in" : "ticker-fade-out"}`}
          style={{ position: "absolute", left: 0, right: 0, top: 0 }}
        >
          {isShowingStatus ? (
            <span style={{ color: statusColor }}>{statusText}</span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-1 h-1 rounded-full shrink-0"
                style={{ backgroundColor: TYPE_DOTS[messages[currentIndex]?.type] || "#7B61FF" }}
              />
              <span className="text-gray-500 shrink-0">
                {messages[currentIndex]?.agentEmoji}
              </span>
              <span className="font-medium shrink-0" style={{ color: "#8B93A0" }}>
                {messages[currentIndex]?.agentTitle}:
              </span>
              <span
                className="text-gray-300 truncate"
                style={{ maxWidth: "calc(100vw - 120px)" }}
              >
                {messages[currentIndex]?.text}
              </span>
            </span>
          )}
        </div>
      </div>
    </>
  );
}
