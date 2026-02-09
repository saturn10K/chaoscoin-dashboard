"use client";

import { useState, useMemo } from "react";
import {
  ZONE_NAMES,
  ZONE_COLORS,
  ZONE_MODIFIERS,
  ZONE_IMAGES,
  ZONE_RISK,
  ZONE_DESCRIPTIONS,
  ZONE_BONUS_DETAIL,
  SHIELD_NAMES,
} from "../lib/constants";
import type { AgentProfile } from "../hooks/useAgents";

interface ZoneMapProps {
  zoneCounts: number[];
  totalAgents: number;
  agents: AgentProfile[];
  onSelectAgent?: (agentId: number) => void;
}

/** Per-zone aggregated stats */
interface ZoneStats {
  agents: AgentProfile[];
  totalHashrate: number;
  totalMined: number;
  avgHashrate: number;
  shielded: number;
}

export default function ZoneMap({ zoneCounts, totalAgents, agents, onSelectAgent }: ZoneMapProps) {
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const maxCount = Math.max(...zoneCounts, 1);

  // Aggregate agent stats per zone
  const zoneStats = useMemo<ZoneStats[]>(() => {
    const stats: ZoneStats[] = Array.from({ length: 8 }, () => ({
      agents: [],
      totalHashrate: 0,
      totalMined: 0,
      avgHashrate: 0,
      shielded: 0,
    }));
    for (const a of agents) {
      const z = a.zone;
      if (z < 0 || z > 7) continue;
      stats[z].agents.push(a);
      stats[z].totalHashrate += Number(a.hashrate);
      stats[z].totalMined += parseFloat(a.totalMined) || 0;
      if (a.shieldLevel > 0) stats[z].shielded++;
    }
    for (const s of stats) {
      s.avgHashrate = s.agents.length > 0 ? Math.round(s.totalHashrate / s.agents.length) : 0;
    }
    return stats;
  }, [agents]);

  const RADIUS = 120;
  const CENTER = 160;
  const positions = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 - 90) * (Math.PI / 180);
    return {
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
    };
  });

  const riskColor = (risk: string) => {
    if (risk === "Very High") return "#FF4444";
    if (risk === "High") return "#ED8936";
    if (risk === "Medium") return "#ECC94B";
    return "#48BB78";
  };

  return (
    <div
      className="rounded-lg border border-white/10 overflow-hidden"
      style={{ backgroundColor: "#0D1117" }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between"
        style={{ backgroundColor: "#06080D" }}
      >
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ color: "#7B61FF" }}
        >
          Zone Map
        </h2>
        <span className="text-xs text-gray-500" style={{ fontFamily: "monospace" }}>
          {totalAgents} agents across 8 zones
        </span>
      </div>

      <div className="p-4">
        {/* Radial visualization */}
        <div className="relative mx-auto" style={{ width: 320, height: 320 }}>
          {/* Connection lines */}
          <svg
            className="absolute inset-0"
            width={320}
            height={320}
            viewBox="0 0 320 320"
          >
            {positions.map((pos, i) => (
              <line
                key={`line-${i}`}
                x1={CENTER}
                y1={CENTER}
                x2={pos.x}
                y2={pos.y}
                stroke={ZONE_COLORS[i]}
                strokeOpacity={selectedZone === i ? 0.5 : 0.15}
                strokeWidth={selectedZone === i ? 2 : 1}
              />
            ))}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="#7B61FF"
              strokeOpacity={0.08}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          </svg>

          {/* Center node */}
          <div
            className="absolute flex flex-col items-center justify-center rounded-full border border-white/10"
            style={{
              width: 56,
              height: 56,
              left: CENTER - 28,
              top: CENTER - 28,
              backgroundColor: "#06080D",
            }}
          >
            <span
              className="text-xs font-bold"
              style={{ color: "#7B61FF", fontFamily: "monospace" }}
            >
              {totalAgents}
            </span>
            <span className="text-xs text-gray-600" style={{ fontSize: 9 }}>
              total
            </span>
          </div>

          {/* Zone nodes */}
          {positions.map((pos, i) => {
            const count = zoneCounts[i] || 0;
            const intensity = count / maxCount;
            const isSelected = selectedZone === i;
            const nodeSize = isSelected ? 76 : 52 + intensity * 20;

            return (
              <div
                key={`zone-${i}`}
                className="absolute flex flex-col items-center justify-center rounded-lg border transition-all duration-300 overflow-hidden"
                style={{
                  width: nodeSize,
                  height: nodeSize,
                  left: pos.x - nodeSize / 2,
                  top: pos.y - nodeSize / 2,
                  backgroundImage: `linear-gradient(rgba(6,8,13,${isSelected ? 0.4 : 0.6}), rgba(6,8,13,${isSelected ? 0.4 : 0.6})), url(${ZONE_IMAGES[i]})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderColor: isSelected
                    ? ZONE_COLORS[i]
                    : `${ZONE_COLORS[i]}40`,
                  borderWidth: isSelected ? 2 : 1,
                  boxShadow: isSelected
                    ? `0 0 20px ${ZONE_COLORS[i]}40`
                    : count > 0
                    ? `0 0 ${8 + intensity * 12}px ${ZONE_COLORS[i]}20`
                    : "none",
                  cursor: "pointer",
                  zIndex: isSelected ? 10 : 1,
                }}
                onClick={() => setSelectedZone(isSelected ? null : i)}
              >
                <span
                  className="text-xs font-bold leading-tight"
                  style={{ color: ZONE_COLORS[i], fontFamily: "monospace" }}
                >
                  {count}
                </span>
                <span
                  className="text-center leading-none mt-0.5"
                  style={{
                    color: `${ZONE_COLORS[i]}CC`,
                    fontSize: 8,
                    maxWidth: nodeSize - 8,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ZONE_NAMES[i]}
                </span>
                <span
                  className="leading-none mt-0.5"
                  style={{
                    fontSize: 7,
                    color:
                      ZONE_MODIFIERS[i]?.startsWith("+") && ZONE_MODIFIERS[i] !== "+0%"
                        ? "#00E5A0"
                        : ZONE_MODIFIERS[i]?.startsWith("-")
                        ? "#FF6B35"
                        : "#6B7280",
                    fontFamily: "monospace",
                  }}
                >
                  {ZONE_MODIFIERS[i]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Zone detail panel — shown when a zone is selected */}
        {selectedZone !== null && (
          <div
            className="mt-4 rounded-lg border overflow-hidden"
            style={{
              backgroundColor: "#06080D",
              borderColor: `${ZONE_COLORS[selectedZone]}30`,
            }}
          >
            {/* Zone header with image */}
            <div className="relative h-28 overflow-hidden">
              <img
                src={ZONE_IMAGES[selectedZone]}
                alt=""
                className="w-full h-full object-cover"
                style={{ opacity: 0.4 }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#06080D] via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: ZONE_COLORS[selectedZone] }}>
                      {ZONE_NAMES[selectedZone]}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Zone {selectedZone}</p>
                  </div>
                  <button
                    onClick={() => setSelectedZone(null)}
                    className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded border border-white/10 hover:border-white/20 transition-colors"
                    style={{ backgroundColor: "#0D111780" }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            {/* Zone stats grid */}
            <div className="p-3 grid grid-cols-4 gap-2 border-b border-white/5">
              <StatBox label="Agents" value={String(zoneCounts[selectedZone] || 0)} color={ZONE_COLORS[selectedZone]} />
              <StatBox label="Hashrate" value={`${zoneStats[selectedZone].totalHashrate} H/s`} color="#00E5A0" />
              <StatBox
                label="Total Mined"
                value={formatCompact(zoneStats[selectedZone].totalMined)}
                color="#ECC94B"
              />
              <StatBox label="Shielded" value={`${zoneStats[selectedZone].shielded}/${zoneCounts[selectedZone] || 0}`} color="#3498DB" />
            </div>

            {/* Zone info */}
            <div className="p-3 border-b border-white/5 space-y-2">
              <p className="text-xs text-gray-400 leading-relaxed">
                {ZONE_DESCRIPTIONS[selectedZone]}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Bonus:</span>
                <span className="text-xs font-medium" style={{ color: "#00E5A0", fontFamily: "monospace" }}>
                  {ZONE_BONUS_DETAIL[selectedZone]}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Risk:</span>
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{
                    color: riskColor(ZONE_RISK[selectedZone]),
                    backgroundColor: `${riskColor(ZONE_RISK[selectedZone])}15`,
                    fontFamily: "monospace",
                  }}
                >
                  {ZONE_RISK[selectedZone]}
                </span>
              </div>
            </div>

            {/* Agents in this zone */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  Agents in zone
                </span>
                <span className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>
                  Avg hashrate: {zoneStats[selectedZone].avgHashrate} H/s
                </span>
              </div>

              {zoneStats[selectedZone].agents.length === 0 ? (
                <div className="text-center py-4 text-gray-600 text-xs">
                  No agents in this zone
                </div>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                  {zoneStats[selectedZone].agents
                    .sort((a, b) => Number(b.hashrate) - Number(a.hashrate))
                    .map((agent) => (
                      <div
                        key={agent.agentId}
                        className="flex items-center justify-between py-1.5 px-2 rounded transition-colors hover:bg-white/5"
                        style={{ cursor: onSelectAgent ? "pointer" : "default" }}
                        onClick={() => onSelectAgent?.(Number(agent.agentId))}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold"
                            style={{ color: ZONE_COLORS[selectedZone], fontFamily: "monospace" }}
                          >
                            #{agent.agentId}
                          </span>
                          <span className="text-xs text-gray-500 truncate" style={{ maxWidth: 90 }}>
                            {agent.operator.slice(0, 6)}...{agent.operator.slice(-4)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {agent.shieldLevel > 0 && (
                            <span className="text-xs" style={{ color: "#3498DB", fontSize: 9 }}>
                              {SHIELD_NAMES[agent.shieldLevel]}
                            </span>
                          )}
                          <span
                            className="text-xs text-gray-400"
                            style={{ fontFamily: "monospace", minWidth: 50, textAlign: "right" }}
                          >
                            {agent.hashrate} H/s
                          </span>
                          <span
                            className="text-xs"
                            style={{
                              fontFamily: "monospace",
                              minWidth: 70,
                              textAlign: "right",
                              color: "#ECC94B",
                            }}
                          >
                            {formatCompact(parseFloat(agent.totalMined) || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Zone legend list — only show when no zone is selected */}
        {selectedZone === null && (
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1">
            {ZONE_NAMES.map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-0.5 rounded px-1 transition-colors hover:bg-white/5"
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedZone(i)}
              >
                <img
                  src={ZONE_IMAGES[i]}
                  alt=""
                  className="w-4 h-4 rounded-sm flex-shrink-0 object-cover"
                  style={{ border: `1px solid ${ZONE_COLORS[i]}40` }}
                />
                <span className="text-xs text-gray-400 truncate flex-1">{name}</span>
                <span
                  className="text-xs text-gray-500 flex-shrink-0"
                  style={{ fontFamily: "monospace" }}
                >
                  {zoneCounts[i] || 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-xs font-bold" style={{ color, fontFamily: "monospace" }}>
        {value}
      </div>
      <div className="text-xs text-gray-600 mt-0.5" style={{ fontSize: 9 }}>
        {label}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}
