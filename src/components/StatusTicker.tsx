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
  const [phase, setPhase] = useState<"enter" | "scroll" | "exit">("enter");
  const cycleCountRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch recent social messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/social/feed?count=10`);
      if (!res.ok) return;
      const data = await res.json();
      const msgs = (data.messages || []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        agentEmoji: (m.agentEmoji as string) || "",
        agentTitle: (m.agentTitle as string) || "Agent",
        text: (m.text as string) || "",
        type: (m.type as string) || "observation",
      }));
      if (msgs.length > 0) setMessages(msgs);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 12_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Advance to next message
  const advanceToNext = useCallback(() => {
    // Fade out
    setPhase("exit");

    timerRef.current = setTimeout(() => {
      cycleCountRef.current += 1;

      // Show status line every 5th cycle
      if (cycleCountRef.current % 5 === 0) {
        setCurrentIndex(-1);
      } else {
        setCurrentIndex((prev) => {
          const next = prev === -1 ? 0 : prev + 1;
          return next >= messages.length ? 0 : next;
        });
      }

      // Fade in
      setPhase("enter");
    }, 400);
  }, [messages.length]);

  // After entering, measure overflow and either scroll or wait then advance
  useEffect(() => {
    if (phase !== "enter") return;
    if (timerRef.current) clearTimeout(timerRef.current);

    // Short delay to let the DOM render and measure
    timerRef.current = setTimeout(() => {
      const container = containerRef.current;
      const content = contentRef.current;

      if (!container || !content) {
        // No content to measure — just advance after a pause
        timerRef.current = setTimeout(advanceToNext, 3500);
        return;
      }

      const overflow = content.scrollWidth - container.clientWidth;

      if (overflow > 10) {
        // Content overflows — start scrolling
        // Speed: ~50px/s, min 3s, max 12s
        const scrollDuration = Math.min(Math.max(overflow / 50, 3), 12);
        content.style.transition = `transform ${scrollDuration}s linear`;
        content.style.transform = `translateX(-${overflow + 20}px)`;
        setPhase("scroll");

        // After scroll finishes, wait a beat then advance
        timerRef.current = setTimeout(advanceToNext, scrollDuration * 1000 + 800);
      } else {
        // Fits in container — just show for a few seconds
        timerRef.current = setTimeout(advanceToNext, 4000);
      }
    }, 100);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, currentIndex, advanceToNext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isShowingStatus = currentIndex === -1 || messages.length === 0;
  const msg = !isShowingStatus ? messages[currentIndex] : null;

  return (
    <>
      <style>{`
        .ticker-container {
          position: relative;
          overflow: hidden;
          height: 20px;
        }
        .ticker-track {
          white-space: nowrap;
          height: 20px;
          line-height: 20px;
          transition: opacity 0.35s ease;
        }
        .ticker-phase-enter {
          opacity: 1;
        }
        .ticker-phase-scroll {
          opacity: 1;
        }
        .ticker-phase-exit {
          opacity: 0;
        }
        .ticker-inner {
          display: inline-flex;
          align-items: center;
          height: 20px;
          gap: 6px;
          will-change: transform;
        }
      `}</style>
      <div className="ticker-container" ref={containerRef}>
        <div className={`ticker-track ticker-phase-${phase}`}>
          {isShowingStatus ? (
            <span style={{ color: statusColor }}>{statusText}</span>
          ) : msg ? (
            <div
              ref={contentRef}
              className="ticker-inner"
              style={{ transform: "translateX(0)", transition: "none" }}
              key={msg.id + "-" + currentIndex}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: TYPE_DOTS[msg.type] || "#7B61FF" }}
              />
              <span className="text-gray-500 shrink-0">{msg.agentEmoji}</span>
              <span className="font-medium shrink-0" style={{ color: "#8B93A0" }}>
                {msg.agentTitle}:
              </span>
              <span className="text-gray-300">{msg.text}</span>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
