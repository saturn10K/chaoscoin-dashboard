"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SabotageEvent } from "../hooks/useSabotage";
import type { AllianceEvent } from "../hooks/useSocialFeed";
import type { CosmicEvent } from "../hooks/useCosmicEvents";
import type { AgentProfile } from "../hooks/useAgents";

interface Toast {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  createdAt: number;
}

const MAX_TOASTS = 4;
const TOAST_DURATION = 6000;

interface EventToastsProps {
  sabotageEvents: SabotageEvent[];
  allianceEvents: AllianceEvent[];
  cosmicEvents: CosmicEvent[];
  agents: AgentProfile[];
}

export default function EventToasts({
  sabotageEvents,
  allianceEvents,
  cosmicEvents,
  agents,
}: EventToastsProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastSabotageIdRef = useRef<string>("");
  const lastAllianceTimestampRef = useRef<number>(0);
  const lastCosmicIdRef = useRef<number>(0);
  const checkedMilestones = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const addToast = useCallback((toast: Omit<Toast, "createdAt">) => {
    setToasts((prev) => {
      const next = [{ ...toast, createdAt: Date.now() }, ...prev];
      return next.slice(0, MAX_TOASTS);
    });
  }, []);

  // Auto-dismiss
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => now - t.createdAt < TOAST_DURATION));
    }, 500);
    return () => clearInterval(timer);
  }, [toasts.length]);

  // Skip initial data load to avoid toast spam
  useEffect(() => {
    const timer = setTimeout(() => { initializedRef.current = true; }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // High-damage sabotage
  useEffect(() => {
    if (!initializedRef.current || sabotageEvents.length === 0) return;
    if (sabotageEvents[0].id === lastSabotageIdRef.current) return;
    const prevId = lastSabotageIdRef.current;
    lastSabotageIdRef.current = sabotageEvents[0].id;

    for (const evt of sabotageEvents) {
      if (evt.id === prevId) break;
      if (evt.damage >= 15) {
        addToast({
          id: `sab-${evt.id}`,
          title: "⚔️ Devastating Attack!",
          description: `${evt.attackerTitle || `Agent #${evt.attackerAgentId}`} dealt ${evt.damage}% damage to ${evt.targetTitle || `Agent #${evt.targetAgentId}`}`,
          color: "#FF4444",
          icon: "⚔️",
        });
        break; // Only toast the most severe
      }
    }
  }, [sabotageEvents, addToast]);

  // Alliance events
  useEffect(() => {
    if (!initializedRef.current || allianceEvents.length === 0) return;
    const prevTs = lastAllianceTimestampRef.current;
    lastAllianceTimestampRef.current = Math.max(...allianceEvents.map((e) => e.timestamp));

    for (const evt of allianceEvents) {
      if (evt.timestamp <= prevTs) continue;
      if (evt.type === "betrayal") {
        addToast({
          id: `ally-${evt.allianceId}-${evt.timestamp}`,
          title: "🗡️ Alliance Betrayed!",
          description: evt.details || `Agent #${evt.agentIds[0]} backstabbed their ally!`,
          color: "#FF4444",
          icon: "🗡️",
        });
      } else if (evt.type === "formed") {
        addToast({
          id: `ally-${evt.allianceId}-${evt.timestamp}`,
          title: "🤝 New Alliance",
          description: evt.details || `Agents #${evt.agentIds.join(" & #")} formed an alliance`,
          color: "#00E5A0",
          icon: "🤝",
        });
      }
    }
  }, [allianceEvents, addToast]);

  // Cosmic events
  useEffect(() => {
    if (!initializedRef.current || cosmicEvents.length === 0) return;
    const latest = cosmicEvents[0];
    if (!latest || latest.eventId <= lastCosmicIdRef.current) return;
    lastCosmicIdRef.current = latest.eventId;

    const tierLabels = ["", "Minor", "Major", "Catastrophic"];
    const tierColors = ["", "#00E5A0", "#ECC94B", "#FF4444"];
    addToast({
      id: `cosmic-${latest.eventId}`,
      title: `🌀 ${tierLabels[latest.severityTier] || "Cosmic"} Event!`,
      description: `Severity T${latest.severityTier} struck Zone ${latest.originZone}`,
      color: tierColors[latest.severityTier] || "#7B61FF",
      icon: "🌀",
    });
  }, [cosmicEvents, addToast]);

  // Mining milestones (1M, 5M, 10M)
  useEffect(() => {
    if (!initializedRef.current) return;
    for (const agent of agents) {
      const mined = parseFloat(agent.totalMined) || 0;
      const milestones = [10_000_000, 5_000_000, 1_000_000];
      for (const m of milestones) {
        const key = `${agent.agentId}-${m}`;
        if (mined >= m && !checkedMilestones.current.has(key)) {
          checkedMilestones.current.add(key);
          const label = m >= 10_000_000 ? "10M" : m >= 5_000_000 ? "5M" : "1M";
          addToast({
            id: `milestone-${key}`,
            title: `🏆 ${label} CHAOS Mined!`,
            description: `Agent #${agent.agentId} crossed ${label} total mined`,
            color: "#ECC94B",
            icon: "🏆",
          });
          break; // Only highest milestone
        }
      }
    }
  }, [agents, addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-40 pointer-events-none flex flex-col-reverse gap-2 w-80">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const elapsed = Date.now() - toast.createdAt;
          const progress = Math.max(0, 1 - elapsed / TOAST_DURATION);
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 40, scale: 0.85, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{
                opacity: 0,
                y: 20,
                scale: 0.9,
                filter: "blur(4px)",
                transition: { duration: 0.25, ease: "easeIn" },
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
                mass: 0.8,
              }}
              className="pointer-events-auto rounded-lg overflow-hidden border backdrop-blur-md"
              style={{
                backgroundColor: "#0D1117E8",
                borderColor: `${toast.color}40`,
                boxShadow: `0 4px 30px ${toast.color}20, 0 0 1px ${toast.color}40`,
              }}
            >
              {/* Color accent bar */}
              <div className="h-0.5" style={{ backgroundColor: toast.color }} />

              <div className="px-3 py-2.5">
                <div className="text-xs font-bold text-gray-100 mb-0.5">{toast.title}</div>
                <div className="text-[11px] text-gray-400 leading-snug">{toast.description}</div>
              </div>

              {/* Shrinking progress bar */}
              <motion.div
                className="h-[2px]"
                style={{ backgroundColor: `${toast.color}60` }}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: TOAST_DURATION / 1000, ease: "linear" }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
