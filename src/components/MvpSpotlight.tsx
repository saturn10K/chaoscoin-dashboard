"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentProfile } from "../hooks/useAgents";
import type { SabotageStats } from "../hooks/useSabotage";
import { ZONE_NAMES, ZONE_COLORS } from "../lib/constants";

interface MvpSpotlightProps {
  agents: AgentProfile[];
  sabotageStats: SabotageStats | null;
}

interface MvpEntry {
  category: string;
  categoryIcon: string;
  agentId: string;
  statLabel: string;
  statValue: string;
  color: string;
  zone: number;
}

const ROTATE_INTERVAL = 8000; // 8s per MVP

export default function MvpSpotlight({ agents, sabotageStats }: MvpSpotlightProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const mvps = useMemo<MvpEntry[]>(() => {
    const entries: MvpEntry[] = [];
    if (agents.length === 0) return entries;

    // Most Mined
    const topMiner = [...agents].sort(
      (a, b) => (parseFloat(b.totalMined) || 0) - (parseFloat(a.totalMined) || 0)
    )[0];
    if (topMiner) {
      const mined = parseFloat(topMiner.totalMined) || 0;
      entries.push({
        category: "TOP MINER",
        categoryIcon: "⛏️",
        agentId: topMiner.agentId,
        statLabel: "Total Mined",
        statValue: mined >= 1_000_000 ? `${(mined / 1_000_000).toFixed(1)}M` : mined >= 1_000 ? `${(mined / 1_000).toFixed(1)}K` : mined.toFixed(0),
        color: "#00E5A0",
        zone: topMiner.zone,
      });
    }

    // Highest Hashrate
    const topHashrate = [...agents].sort(
      (a, b) => (parseFloat(b.hashrate) || 0) - (parseFloat(a.hashrate) || 0)
    )[0];
    if (topHashrate && topHashrate.agentId !== topMiner?.agentId) {
      entries.push({
        category: "HASH KING",
        categoryIcon: "👑",
        agentId: topHashrate.agentId,
        statLabel: "Hashrate",
        statValue: `${parseFloat(topHashrate.hashrate).toLocaleString()} H/s`,
        color: "#ECC94B",
        zone: topHashrate.zone,
      });
    }

    // Most attacks (from sabotage stats)
    if (sabotageStats?.topAttackers && sabotageStats.topAttackers.length > 0) {
      const topAttacker = sabotageStats.topAttackers[0];
      entries.push({
        category: "WAR LORD",
        categoryIcon: "⚔️",
        agentId: String(topAttacker.agentId),
        statLabel: "Attacks",
        statValue: String(topAttacker.attackCount),
        color: "#FF4444",
        zone: agents.find((a) => a.agentId === String(topAttacker.agentId))?.zone ?? 0,
      });
    }

    // Most targeted
    if (sabotageStats?.topTargets && sabotageStats.topTargets.length > 0) {
      const topTarget = sabotageStats.topTargets[0];
      entries.push({
        category: "MOST WANTED",
        categoryIcon: "🎯",
        agentId: String(topTarget.agentId),
        statLabel: "Times Targeted",
        statValue: String(topTarget.timesTargeted),
        color: "#FF9D3D",
        zone: agents.find((a) => a.agentId === String(topTarget.agentId))?.zone ?? 0,
      });
    }

    // Highest Resilience
    const topRes = [...agents].sort(
      (a, b) => (parseFloat(b.cosmicResilience) || 0) - (parseFloat(a.cosmicResilience) || 0)
    )[0];
    if (topRes) {
      entries.push({
        category: "SURVIVOR",
        categoryIcon: "🛡️",
        agentId: topRes.agentId,
        statLabel: "Resilience",
        statValue: parseFloat(topRes.cosmicResilience).toFixed(0),
        color: "#60A5FA",
        zone: topRes.zone,
      });
    }

    return entries;
  }, [agents, sabotageStats]);

  // Rotate
  useEffect(() => {
    if (mvps.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % mvps.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [mvps.length]);

  if (mvps.length === 0) return null;
  const mvp = mvps[activeIndex % mvps.length];
  if (!mvp) return null;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: "#0D1117",
        borderColor: `${mvp.color}25`,
        boxShadow: `0 0 30px ${mvp.color}08`,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 border-b border-white/10 flex items-center justify-between"
        style={{ backgroundColor: "#06080D" }}
      >
        <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#7B61FF" }}>
          ✦ MVP Spotlight
        </h2>
        {/* Pagination dots */}
        <div className="flex items-center gap-1">
          {mvps.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => setActiveIndex(i)}
              className="w-1.5 h-1.5 rounded-full"
              animate={{
                backgroundColor: i === activeIndex % mvps.length ? mvp.color : "#4A556860",
                scale: i === activeIndex % mvps.length ? 1.3 : 1,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          ))}
        </div>
      </div>

      <div className="px-3 py-3 relative overflow-hidden" style={{ minHeight: 64 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mvp.category}-${mvp.agentId}`}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex items-center gap-3"
          >
            {/* Icon circle */}
            <motion.div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
              style={{
                background: `radial-gradient(circle, ${mvp.color}25, ${mvp.color}08)`,
                border: `1px solid ${mvp.color}30`,
              }}
              animate={{
                boxShadow: [
                  `0 0 8px ${mvp.color}20`,
                  `0 0 20px ${mvp.color}35`,
                  `0 0 8px ${mvp.color}20`,
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {mvp.categoryIcon}
            </motion.div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-black tracking-widest uppercase"
                  style={{ color: mvp.color }}
                >
                  {mvp.category}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-gray-100" style={{ fontFamily: "monospace" }}>
                  Agent #{mvp.agentId}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    color: ZONE_COLORS[mvp.zone] || "#6B7280",
                    backgroundColor: `${ZONE_COLORS[mvp.zone] || "#6B7280"}15`,
                  }}
                >
                  {ZONE_NAMES[mvp.zone]?.replace("The ", "") || `Zone ${mvp.zone}`}
                </span>
              </div>
            </div>

            {/* Stat */}
            <div className="text-right flex-shrink-0">
              <motion.div
                className="text-lg font-black"
                style={{ color: mvp.color, fontFamily: "monospace" }}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                {mvp.statValue}
              </motion.div>
              <div className="text-[10px] text-gray-500">{mvp.statLabel}</div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
