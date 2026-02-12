"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import type { SabotageEvent } from "../hooks/useSabotage";
import type { CosmicEvent } from "../hooks/useCosmicEvents";

interface ZoneMapProps {
  zoneCounts: number[];
  totalAgents: number;
  agents: AgentProfile[];
  onSelectAgent?: (agentId: number) => void;
  pulsingZones?: Set<number>;
  sabotageEvents?: SabotageEvent[];
  cosmicEvents?: CosmicEvent[];
}

interface ZoneStats {
  agents: AgentProfile[];
  totalHashrate: number;
  totalMined: number;
  avgHashrate: number;
  shielded: number;
}

// ── Flat-top hex geometry ──────────────────────────────────────────────
const S = 56;
const HEX_H = Math.sqrt(3) * S;
const COL_STEP = 1.5 * S;
const ROW_STEP = HEX_H;

function hexPath(size: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 6; k++) {
    const angle = (Math.PI / 180) * (60 * k);
    pts.push(`${size * Math.cos(angle)},${size * Math.sin(angle)}`);
  }
  return `M${pts.join("L")}Z`;
}

const GRID: [number, number][] = [
  [0, 0], [2, 0], [1, 0], [3, 0],
  [0, 1], [2, 1], [1, 1], [3, 1],
];

function hexPositions(): { x: number; y: number }[] {
  return GRID.map(([col, row]) => ({
    x: col * COL_STEP,
    y: row * ROW_STEP + (col % 2 === 1 ? HEX_H / 2 : 0),
  }));
}

const ADJACENCY: [number, number][] = [
  [0, 2], [2, 1], [1, 3], [0, 6], [2, 4], [2, 6],
  [2, 5], [3, 5], [3, 7], [1, 7], [4, 6], [6, 5], [5, 7],
];

// ── Particle generator (deterministic per zone) ──────────────────────
interface Particle {
  id: string;
  cx: number;
  cy: number;
  r: number;
  delay: number;
  dur: number;
  drift: number;
}

function generateParticles(zoneIndex: number, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let j = 0; j < Math.min(count, 6); j++) {
    // Deterministic pseudo-random from zone + particle index
    const seed = zoneIndex * 100 + j;
    const angle = ((seed * 137.5) % 360) * (Math.PI / 180);
    const dist = 12 + (seed * 7.3 % 30);
    particles.push({
      id: `p-${zoneIndex}-${j}`,
      cx: Math.cos(angle) * dist,
      cy: Math.sin(angle) * dist,
      r: 1.5 + (seed % 3) * 0.5,
      delay: (j * 0.6) % 4,
      dur: 3 + (seed % 4),
      drift: 4 + (seed % 6),
    });
  }
  return particles;
}

// ── Warfare line tracker ─────────────────────────────────────────────
interface WarfareLine {
  id: string;
  fromZone: number;
  toZone: number;
  timestamp: number;
  type: string;
}

// ── Activity spark tracker ───────────────────────────────────────────
interface ActivitySpark {
  id: string;
  zone: number;
  timestamp: number;
  color: string;
}

// ── Component ──────────────────────────────────────────────────────────

export default function ZoneMap({
  zoneCounts,
  totalAgents,
  agents,
  onSelectAgent,
  pulsingZones,
  sabotageEvents = [],
  cosmicEvents = [],
}: ZoneMapProps) {
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [hoveredZone, setHoveredZone] = useState<number | null>(null);
  const [warfareLines, setWarfareLines] = useState<WarfareLine[]>([]);
  const [activitySparks, setActivitySparks] = useState<ActivitySpark[]>([]);
  const [cosmicShockwave, setCosmicShockwave] = useState<{ zone: number; tier: number; id: number } | null>(null);
  const lastSabotageIdRef = useRef<string>("");
  const lastCosmicIdRef = useRef<number>(0);
  const initializedRef = useRef(false);
  const maxCount = Math.max(...zoneCounts, 1);

  // Skip initial data to avoid animation spam on load
  useEffect(() => {
    if (sabotageEvents.length > 0) lastSabotageIdRef.current = sabotageEvents[0].id;
    if (cosmicEvents.length > 0) lastCosmicIdRef.current = cosmicEvents[0].eventId;
    const timer = setTimeout(() => { initializedRef.current = true; }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Track new sabotage → warfare lines + activity sparks
  useEffect(() => {
    if (!initializedRef.current || sabotageEvents.length === 0) return;
    if (sabotageEvents[0].id === lastSabotageIdRef.current) return;
    const prevId = lastSabotageIdRef.current;
    lastSabotageIdRef.current = sabotageEvents[0].id;

    const newLines: WarfareLine[] = [];
    const newSparks: ActivitySpark[] = [];
    for (const evt of sabotageEvents) {
      if (evt.id === prevId) break;
      // Find attacker zone
      const attackerAgent = agents.find((a) => a.agentId === String(evt.attackerAgentId));
      const targetAgent = agents.find((a) => a.agentId === String(evt.targetAgentId));
      if (attackerAgent && targetAgent && attackerAgent.zone !== targetAgent.zone) {
        newLines.push({
          id: evt.id,
          fromZone: attackerAgent.zone,
          toZone: targetAgent.zone,
          timestamp: evt.timestamp,
          type: evt.type,
        });
      }
      // Spark on target zone
      newSparks.push({
        id: `spark-${evt.id}`,
        zone: evt.zone,
        timestamp: Date.now(),
        color: evt.type === "facility_raid" ? "#FF4444" : evt.type === "rig_jam" ? "#FF9D3D" : "#ECC94B",
      });
    }

    if (newLines.length > 0) {
      setWarfareLines((prev) => [...newLines, ...prev].slice(0, 10));
      // Auto-clear after 10s
      setTimeout(() => {
        const ids = new Set(newLines.map((l) => l.id));
        setWarfareLines((prev) => prev.filter((l) => !ids.has(l.id)));
      }, 10000);
    }
    if (newSparks.length > 0) {
      setActivitySparks((prev) => [...newSparks, ...prev].slice(0, 12));
      setTimeout(() => {
        const ids = new Set(newSparks.map((s) => s.id));
        setActivitySparks((prev) => prev.filter((s) => !ids.has(s.id)));
      }, 3000);
    }
  }, [sabotageEvents, agents]);

  // Track cosmic events → zone shockwave
  useEffect(() => {
    if (!initializedRef.current || cosmicEvents.length === 0) return;
    const latest = cosmicEvents[0];
    if (!latest || latest.eventId <= lastCosmicIdRef.current) return;
    lastCosmicIdRef.current = latest.eventId;

    setCosmicShockwave({ zone: latest.originZone, tier: latest.severityTier, id: latest.eventId });
    setTimeout(() => setCosmicShockwave(null), 4000);
  }, [cosmicEvents]);

  const zoneStats = useMemo<ZoneStats[]>(() => {
    const stats: ZoneStats[] = Array.from({ length: 8 }, () => ({
      agents: [], totalHashrate: 0, totalMined: 0, avgHashrate: 0, shielded: 0,
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

  // Compute total hashrate for glow normalization
  const totalHashrate = useMemo(() => zoneStats.reduce((s, z) => s + z.totalHashrate, 0) || 1, [zoneStats]);

  const positions = useMemo(hexPositions, []);

  // SVG viewBox
  const pad = S + 14;
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  const vw = maxX - minX;
  const vh = maxY - minY;

  const hexOutline = hexPath(S);
  const hexClip = hexPath(S - 0.5);

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
        <h2 className="text-sm font-semibold tracking-wide uppercase" style={{ color: "#7B61FF" }}>
          Zone Map
        </h2>
        <span className="text-xs text-gray-500" style={{ fontFamily: "monospace" }}>
          {totalAgents} agents across 8 zones
        </span>
      </div>

      <div className="p-4">
        <svg viewBox={`${minX} ${minY} ${vw} ${vh}`} className="w-full" style={{ maxHeight: 360 }}>
          <defs>
            {positions.map((_, i) => (
              <clipPath key={`clip-${i}`} id={`hclip-${i}`}>
                <path d={hexClip} />
              </clipPath>
            ))}
            {ZONE_COLORS.map((color, i) => {
              const hashShare = zoneStats[i]?.totalHashrate / totalHashrate;
              const glowSize = 3 + hashShare * 12; // 3-15 based on hashrate share
              return (
                <filter key={`glow-${i}`} id={`hglow-${i}`} x="-60%" y="-60%" width="220%" height="220%">
                  <feDropShadow dx="0" dy="0" stdDeviation={glowSize} floodColor={color} floodOpacity={0.3 + hashShare * 0.4} />
                </filter>
              );
            })}
            {/* Warfare glow */}
            <filter id="war-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Edge lines between adjacent hexes */}
          {ADJACENCY.map(([a, b]) => {
            const pa = positions[a];
            const pb = positions[b];
            const aHot = a === selectedZone || a === hoveredZone;
            const bHot = b === selectedZone || b === hoveredZone;
            const hot = aHot || bHot;
            return (
              <line
                key={`e-${a}-${b}`}
                x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke={hot ? (aHot ? ZONE_COLORS[a] : ZONE_COLORS[b]) : "#7B61FF"}
                strokeOpacity={hot ? 0.3 : 0.04}
                strokeWidth={hot ? 1.5 : 0.5}
                style={{ transition: "all 0.3s ease" }}
              />
            );
          })}

          {/* Warfare lines (cross-zone sabotage) */}
          {warfareLines.map((line) => {
            const from = positions[line.fromZone];
            const to = positions[line.toZone];
            if (!from || !to) return null;
            return (
              <g key={`war-${line.id}`}>
                <line
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke="#FF4444"
                  strokeWidth={2}
                  strokeOpacity={0.6}
                  strokeDasharray="6 4"
                  filter="url(#war-glow)"
                >
                  <animate attributeName="stroke-dashoffset" values="0;-20" dur="0.6s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" />
                </line>
              </g>
            );
          })}

          {/* Hexagons */}
          {positions
            .map((pos, i) => ({ pos, i }))
            .sort((a, b) => {
              const aZ = a.i === selectedZone ? 2 : a.i === hoveredZone ? 1 : 0;
              const bZ = b.i === selectedZone ? 2 : b.i === hoveredZone ? 1 : 0;
              return aZ - bZ;
            })
            .map(({ pos, i }) => {
              const count = zoneCounts[i] || 0;
              const intensity = count / maxCount;
              const isSel = selectedZone === i;
              const isHov = hoveredZone === i;
              const active = isSel || isHov;
              const scale = isSel ? 1.13 : isHov ? 1.09 : 1;
              const hashShare = zoneStats[i]?.totalHashrate / totalHashrate;
              const particles = generateParticles(i, count);
              const hasCosmicShock = cosmicShockwave?.zone === i;

              // Breathing speed based on activity level
              const breatheDur = count > 3 ? 3 : count > 1 ? 5 : 8;

              return (
                <g
                  key={`h-${i}`}
                  transform={`translate(${pos.x},${pos.y})`}
                  onClick={() => setSelectedZone(isSel ? null : i)}
                  onMouseEnter={() => setHoveredZone(i)}
                  onMouseLeave={() => setHoveredZone(null)}
                  style={{ cursor: "pointer" }}
                >
                  <g
                    className="hex-pop"
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: "0 0",
                      transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  >
                    {/* Heatmap glow (outer, based on hashrate share) */}
                    <path
                      d={hexPath(S + 4)}
                      fill={ZONE_COLORS[i]}
                      fillOpacity={0.05 + hashShare * 0.15}
                      style={{ transition: "fill-opacity 1s ease" }}
                    />

                    {/* Zone image clipped to hex */}
                    <g clipPath={`url(#hclip-${i})`}>
                      <image
                        href={ZONE_IMAGES[i]}
                        x={-S} y={-S} width={S * 2} height={S * 2}
                        preserveAspectRatio="xMidYMid slice"
                        opacity={active ? 0.5 : 0.2 + intensity * 0.1}
                        style={{ transition: "opacity 0.3s ease" }}
                      />
                      <path
                        d={hexClip}
                        fill="#06080D"
                        opacity={active ? 0.3 : 0.55}
                        style={{ transition: "opacity 0.3s ease" }}
                      />
                    </g>

                    {/* Hex border with dynamic glow */}
                    <path
                      d={hexOutline}
                      fill="none"
                      stroke={ZONE_COLORS[i]}
                      strokeWidth={isSel ? 2.5 : isHov ? 2 : 1 + hashShare * 1.5}
                      strokeOpacity={isSel ? 0.9 : isHov ? 0.7 : 0.2 + intensity * 0.3}
                      filter={active || hashShare > 0.15 ? `url(#hglow-${i})` : undefined}
                      style={{ transition: "all 0.4s ease" }}
                    />

                    {/* Floating agent particles */}
                    {particles.map((p) => (
                      <circle
                        key={p.id}
                        cx={p.cx}
                        cy={p.cy}
                        r={p.r}
                        fill={ZONE_COLORS[i]}
                        fillOpacity={0.5}
                      >
                        <animate
                          attributeName="cy"
                          values={`${p.cy};${p.cy - p.drift};${p.cy}`}
                          dur={`${p.dur}s`}
                          begin={`${p.delay}s`}
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="fill-opacity"
                          values="0.3;0.7;0.3"
                          dur={`${p.dur}s`}
                          begin={`${p.delay}s`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    ))}

                    {/* Agent count */}
                    <text
                      y={-10}
                      textAnchor="middle"
                      fill={ZONE_COLORS[i]}
                      fontSize={active ? 19 : 16}
                      fontWeight="bold"
                      fontFamily="monospace"
                      style={{ transition: "font-size 0.2s ease" }}
                    >
                      {count}
                    </text>

                    {/* Zone name */}
                    <text
                      y={6}
                      textAnchor="middle"
                      fill={`${ZONE_COLORS[i]}CC`}
                      fontSize={7.5}
                      fontFamily="sans-serif"
                      fontWeight={active ? "600" : "400"}
                    >
                      {ZONE_NAMES[i].replace("The ", "")}
                    </text>

                    {/* Modifier */}
                    <text
                      y={18}
                      textAnchor="middle"
                      fill={
                        ZONE_MODIFIERS[i]?.startsWith("+") && ZONE_MODIFIERS[i] !== "+0%"
                          ? "#00E5A0"
                          : ZONE_MODIFIERS[i]?.startsWith("-")
                          ? "#FF6B35"
                          : "#6B7280"
                      }
                      fontSize={8}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {ZONE_MODIFIERS[i]}
                    </text>

                    {/* Hashrate bar beneath modifier */}
                    {count > 0 && (
                      <g>
                        <rect
                          x={-20} y={23}
                          width={40} height={2}
                          rx={1}
                          fill="white"
                          fillOpacity={0.05}
                        />
                        <rect
                          x={-20} y={23}
                          width={Math.max(2, hashShare * 40)}
                          height={2}
                          rx={1}
                          fill={ZONE_COLORS[i]}
                          fillOpacity={0.5}
                          style={{ transition: "width 0.8s ease" }}
                        />
                      </g>
                    )}

                    {/* Breathing pulse ring */}
                    {count > 0 && (
                      <path
                        d={hexPath(S + 3)}
                        fill="none"
                        stroke={ZONE_COLORS[i]}
                        strokeWidth={0.5}
                      >
                        <animate
                          attributeName="stroke-opacity"
                          values="0.05;0.2;0.05"
                          dur={`${breatheDur}s`}
                          repeatCount="indefinite"
                        />
                        <animateTransform
                          attributeName="transform"
                          type="scale"
                          values="1;1.015;1"
                          dur={`${breatheDur}s`}
                          repeatCount="indefinite"
                          additive="sum"
                        />
                      </path>
                    )}

                    {/* Social message flash */}
                    {pulsingZones?.has(i) && (
                      <>
                        <path d={hexPath(S + 2)} fill="none" stroke={ZONE_COLORS[i]} strokeWidth={3}>
                          <animate attributeName="stroke-opacity" values="0;1;0.8;0" dur="1.5s" repeatCount="1" />
                          <animate attributeName="stroke-width" values="1;4;3;1" dur="1.5s" repeatCount="1" />
                        </path>
                        <path d={hexPath(S + 6)} fill="none" stroke={ZONE_COLORS[i]} strokeWidth={1}>
                          <animate attributeName="stroke-opacity" values="0;0.5;0.3;0" dur="1.5s" repeatCount="1" />
                        </path>
                      </>
                    )}

                    {/* Activity sparks */}
                    {activitySparks
                      .filter((s) => s.zone === i)
                      .map((spark) => (
                        <circle key={spark.id} cx={0} cy={0} fill="none" stroke={spark.color} strokeWidth={2}>
                          <animate attributeName="r" values="3;30" dur="1.5s" repeatCount="1" />
                          <animate attributeName="stroke-opacity" values="0.8;0" dur="1.5s" repeatCount="1" />
                        </circle>
                      ))}

                    {/* Cosmic shockwave on origin zone */}
                    {hasCosmicShock && (
                      <>
                        <circle cx={0} cy={0} fill="none" stroke={cosmicShockwave.tier >= 3 ? "#FF4444" : cosmicShockwave.tier >= 2 ? "#ECC94B" : "#00E5A0"} strokeWidth={3}>
                          <animate attributeName="r" values="5;70" dur="2s" repeatCount="1" />
                          <animate attributeName="stroke-opacity" values="0.8;0" dur="2s" repeatCount="1" />
                          <animate attributeName="stroke-width" values="3;0.5" dur="2s" repeatCount="1" />
                        </circle>
                        <circle cx={0} cy={0} fill="none" stroke={cosmicShockwave.tier >= 3 ? "#FF4444" : cosmicShockwave.tier >= 2 ? "#ECC94B" : "#00E5A0"} strokeWidth={2}>
                          <animate attributeName="r" values="5;50" dur="1.5s" begin="0.3s" repeatCount="1" />
                          <animate attributeName="stroke-opacity" values="0.5;0" dur="1.5s" begin="0.3s" repeatCount="1" />
                        </circle>
                      </>
                    )}
                  </g>
                </g>
              );
            })}
        </svg>

        {/* Zone detail panel */}
        <AnimatePresence>
          {selectedZone !== null && (
            <motion.div
              key={`zone-detail-${selectedZone}`}
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="mt-4 rounded-lg border overflow-hidden"
              style={{
                backgroundColor: "#06080D",
                borderColor: `${ZONE_COLORS[selectedZone]}30`,
              }}
            >
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

              <div className="p-3 grid grid-cols-4 gap-2 border-b border-white/5">
                <StatBox label="Agents" value={String(zoneCounts[selectedZone] || 0)} color={ZONE_COLORS[selectedZone]} />
                <StatBox label="Hashrate" value={`${zoneStats[selectedZone].totalHashrate} H/s`} color="#00E5A0" />
                <StatBox label="Total Mined" value={formatCompact(zoneStats[selectedZone].totalMined)} color="#ECC94B" />
                <StatBox label="Shielded" value={`${zoneStats[selectedZone].shielded}/${zoneCounts[selectedZone] || 0}`} color="#3498DB" />
              </div>

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

              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Agents in zone</span>
                  <span className="text-xs text-gray-600" style={{ fontFamily: "monospace" }}>
                    Avg hashrate: {zoneStats[selectedZone].avgHashrate} H/s
                  </span>
                </div>

                {zoneStats[selectedZone].agents.length === 0 ? (
                  <div className="text-center py-4 text-gray-600 text-xs">No agents in this zone</div>
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
                            <span className="text-xs font-bold" style={{ color: ZONE_COLORS[selectedZone], fontFamily: "monospace" }}>
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
                            <span className="text-xs text-gray-400" style={{ fontFamily: "monospace", minWidth: 50, textAlign: "right" }}>
                              {agent.hashrate} H/s
                            </span>
                            <span className="text-xs" style={{ fontFamily: "monospace", minWidth: 70, textAlign: "right", color: "#ECC94B" }}>
                              {formatCompact(parseFloat(agent.totalMined) || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zone legend — only when no zone selected */}
        {selectedZone === null && (
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1">
            {ZONE_NAMES.map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-1 rounded px-1.5 transition-all duration-200"
                style={{
                  cursor: "pointer",
                  backgroundColor: hoveredZone === i ? `${ZONE_COLORS[i]}10` : "transparent",
                  borderLeft: hoveredZone === i ? `2px solid ${ZONE_COLORS[i]}` : "2px solid transparent",
                }}
                onClick={() => setSelectedZone(i)}
                onMouseEnter={() => setHoveredZone(i)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <img
                  src={ZONE_IMAGES[i]}
                  alt=""
                  className="w-4 h-4 rounded-sm flex-shrink-0 object-cover transition-transform duration-200"
                  style={{
                    border: `1px solid ${hoveredZone === i ? ZONE_COLORS[i] : `${ZONE_COLORS[i]}40`}`,
                    transform: hoveredZone === i ? "scale(1.15)" : "scale(1)",
                  }}
                />
                <span
                  className="text-xs truncate flex-1 transition-colors duration-200"
                  style={{ color: hoveredZone === i ? ZONE_COLORS[i] : "#9CA3AF" }}
                >
                  {name}
                </span>
                <span
                  className="text-xs flex-shrink-0 transition-colors duration-200"
                  style={{ fontFamily: "monospace", color: hoveredZone === i ? ZONE_COLORS[i] : "#6B7280" }}
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
      <div className="text-xs font-bold" style={{ color, fontFamily: "monospace" }}>{value}</div>
      <div className="text-xs text-gray-600 mt-0.5" style={{ fontSize: 9 }}>{label}</div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}
