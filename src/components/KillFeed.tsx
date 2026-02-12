"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SabotageEvent } from "../hooks/useSabotage";
import type { AllianceEvent } from "../hooks/useSocialFeed";

interface KillFeedItem {
  id: string;
  attackerTitle: string;
  targetTitle: string;
  type: string;
  damage: number;
  timestamp: number;
}

const ATTACK_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  facility_raid: { icon: "🏚️", color: "#FF4444", label: "RAIDED" },
  rig_jam: { icon: "⚙️", color: "#FF9D3D", label: "JAMMED" },
  intel_gathering: { icon: "🔍", color: "#ECC94B", label: "SCOUTED" },
  betrayal: { icon: "🗡️", color: "#FF4444", label: "BETRAYED" },
  alliance_formed: { icon: "🤝", color: "#00E5A0", label: "ALLIED" },
};

const MAX_VISIBLE = 5;
const DISMISS_MS = 8000;

interface KillFeedProps {
  sabotageEvents: SabotageEvent[];
  allianceEvents: AllianceEvent[];
}

export default function KillFeed({ sabotageEvents, allianceEvents }: KillFeedProps) {
  const [items, setItems] = useState<KillFeedItem[]>([]);
  const lastSabotageIdRef = useRef<string>("");
  const lastAllianceTimestampRef = useRef<number>(0);
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Process new sabotage events
  useEffect(() => {
    if (sabotageEvents.length === 0) return;

    const newItems: KillFeedItem[] = [];
    for (const evt of sabotageEvents) {
      if (evt.id === lastSabotageIdRef.current) break;
      newItems.push({
        id: evt.id,
        attackerTitle: evt.attackerTitle || `Agent #${evt.attackerAgentId}`,
        targetTitle: evt.targetTitle || `Agent #${evt.targetAgentId}`,
        type: evt.type,
        damage: evt.damage,
        timestamp: evt.timestamp,
      });
    }

    if (newItems.length > 0) {
      lastSabotageIdRef.current = sabotageEvents[0].id;
      setItems((prev) => [...newItems.reverse(), ...prev].slice(0, MAX_VISIBLE * 2));
    }
  }, [sabotageEvents]);

  // Process new alliance events (betrayals + formations)
  useEffect(() => {
    if (allianceEvents.length === 0) return;

    const newItems: KillFeedItem[] = [];
    for (const evt of allianceEvents) {
      if (evt.timestamp <= lastAllianceTimestampRef.current) continue;
      if (evt.type === "betrayal" || evt.type === "formed") {
        newItems.push({
          id: `alliance-${evt.allianceId}-${evt.timestamp}`,
          attackerTitle: `Agent #${evt.agentIds[0]}`,
          targetTitle: evt.agentIds.length > 1 ? `Agent #${evt.agentIds[1]}` : "",
          type: evt.type === "betrayal" ? "betrayal" : "alliance_formed",
          damage: 0,
          timestamp: evt.timestamp,
        });
      }
    }

    if (newItems.length > 0) {
      lastAllianceTimestampRef.current = Math.max(...allianceEvents.map((e) => e.timestamp));
      setItems((prev) => [...newItems, ...prev].slice(0, MAX_VISIBLE * 2));
    }
  }, [allianceEvents]);

  // Auto-dismiss items
  useEffect(() => {
    for (const item of items) {
      if (!dismissTimers.current.has(item.id)) {
        const timer = setTimeout(() => {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          dismissTimers.current.delete(item.id);
        }, DISMISS_MS);
        dismissTimers.current.set(item.id, timer);
      }
    }
    return () => {
      dismissTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, [items]);

  const visibleItems = items.slice(0, MAX_VISIBLE);

  return (
    <div className="fixed top-16 right-4 z-40 pointer-events-none flex flex-col gap-1.5 w-80">
      <AnimatePresence mode="popLayout">
        {visibleItems.map((item) => {
          const config = ATTACK_CONFIG[item.type] || ATTACK_CONFIG.facility_raid;
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: 120, scale: 0.8, filter: "blur(8px)" }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                filter: "blur(0px)",
              }}
              exit={{
                opacity: 0,
                x: 80,
                scale: 0.9,
                filter: "blur(4px)",
                transition: { duration: 0.3, ease: "easeIn" },
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                mass: 0.8,
              }}
              className="pointer-events-auto rounded-lg px-3 py-2 border backdrop-blur-md"
              style={{
                backgroundColor: `${config.color}12`,
                borderColor: `${config.color}30`,
                boxShadow: `0 0 20px ${config.color}15, inset 0 0 20px ${config.color}05`,
              }}
            >
              <div className="flex items-center gap-2 text-xs">
                {/* Attacker */}
                <span className="font-bold text-gray-200 truncate max-w-[90px]">
                  {item.attackerTitle}
                </span>

                {/* Action */}
                <span className="flex items-center gap-1 flex-shrink-0">
                  <span>{config.icon}</span>
                  <span
                    className="font-black text-[10px] uppercase tracking-wider"
                    style={{ color: config.color }}
                  >
                    {config.label}
                  </span>
                </span>

                {/* Target */}
                <span className="font-bold text-gray-200 truncate max-w-[90px]">
                  {item.targetTitle}
                </span>

                {/* Damage */}
                {item.damage > 0 && (
                  <motion.span
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 600, damping: 15 }}
                    className="ml-auto font-black text-[11px] flex-shrink-0"
                    style={{ color: config.color }}
                  >
                    -{item.damage}%
                  </motion.span>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
