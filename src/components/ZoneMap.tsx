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

interface ZoneStats {
  agents: AgentProfile[];
  totalHashrate: number;
  totalMined: number;
  avgHashrate: number;
  shielded: number;
}

// ── Flat-top hex geometry ──────────────────────────────────────────────
// Flat-top: vertex at left/right, flat edges top/bottom
// For flat-top:
//   width  = 2 * size
//   height = sqrt(3) * size
// Interlocking spacing:
//   col step (horiz) = 1.5 * size   (overlapping by 0.5 * size)
//   row step (vert)  = sqrt(3) * size
//   odd columns shift down by sqrt(3)/2 * size

const S = 56; // hex "radius" — center to vertex
const HEX_W = 2 * S;
const HEX_H = Math.sqrt(3) * S;
const COL_STEP = 1.5 * S; // horizontal distance between column centers
const ROW_STEP = HEX_H;   // vertical distance between row centers

/** Flat-top hexagon SVG path centered at (0,0) */
function hexPath(size: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 6; k++) {
    const angle = (Math.PI / 180) * (60 * k);
    pts.push(`${size * Math.cos(angle)},${size * Math.sin(angle)}`);
  }
  return `M${pts.join("L")}Z`;
}

/**
 * 8 hexagons on an offset hex grid (flat-top, odd-q offset).
 *
 * Grid layout (col, row):
 *
 *    col0    col1    col2    col3
 *   ┌─────┐       ┌─────┐
 *   │  0  │       │  1  │        row 0
 *   └──┬──┘       └──┬──┘
 *      └──┐  ┌──┐  ┌─┘
 *         │  2  │  │  3  │       row 0 (odd cols shifted down)
 *         └──┬──┘  └──┬──┘
 *   ┌─────┐  │       │  ┌─────┐
 *   │  4  │  │       │  │  5  │  row 1
 *   └──┬──┘  │       │  └──┬──┘
 *      └──┐  ┌──┐  ┌─┘  ┌─┘
 *         │  6  │  │  7  │       row 1 (odd cols shifted down)
 *         └─────┘  └─────┘
 *
 * Mapping: zone index → (col, row)
 */
const GRID: [number, number][] = [
  [0, 0], // zone 0 — col 0, row 0
  [2, 0], // zone 1 — col 2, row 0
  [1, 0], // zone 2 — col 1, row 0 (odd col → shifted down)
  [3, 0], // zone 3 — col 3, row 0 (odd col → shifted down)
  [0, 1], // zone 4 — col 0, row 1
  [2, 1], // zone 5 — col 2, row 1
  [1, 1], // zone 6 — col 1, row 1 (odd col → shifted down)
  [3, 1], // zone 7 — col 3, row 1 (odd col → shifted down)
];

function hexPositions(): { x: number; y: number }[] {
  return GRID.map(([col, row]) => {
    const x = col * COL_STEP;
    const y = row * ROW_STEP + (col % 2 === 1 ? HEX_H / 2 : 0);
    return { x, y };
  });
}

/** Which zone pairs share a hex edge */
const ADJACENCY: [number, number][] = [
  [0, 2], // col0r0 — col1r0
  [2, 1], // col1r0 — col2r0
  [1, 3], // col2r0 — col3r0
  [0, 6], // col0r0 — col1r1 (diagonal)
  [2, 4], // col1r0 — col0r1
  [2, 6], // col1r0 — col1r1
  [2, 5], // col1r0 — col2r1
  [3, 5], // col3r0 — col2r1
  [3, 7], // col3r0 — col3r1
  [1, 7], // col2r0 — col3r1 (diagonal)
  [4, 6], // col0r1 — col1r1
  [6, 5], // col1r1 — col2r1
  [5, 7], // col2r1 — col3r1
];

// ── Component ──────────────────────────────────────────────────────────

export default function ZoneMap({ zoneCounts, totalAgents, agents, onSelectAgent }: ZoneMapProps) {
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [hoveredZone, setHoveredZone] = useState<number | null>(null);
  const maxCount = Math.max(...zoneCounts, 1);

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

  const positions = useMemo(hexPositions, []);

  // SVG viewBox
  const pad = S + 8;
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  const vw = maxX - minX;
  const vh = maxY - minY;

  const hexOutline = hexPath(S);
  const hexClip = hexPath(S - 0.5); // slightly inset for clean image clip

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
        {/* Hex grid */}
        <svg
          viewBox={`${minX} ${minY} ${vw} ${vh}`}
          className="w-full"
          style={{ maxHeight: 340 }}
        >
          <defs>
            {positions.map((_, i) => (
              <clipPath key={`clip-${i}`} id={`hclip-${i}`}>
                <path d={hexClip} />
              </clipPath>
            ))}
            {ZONE_COLORS.map((color, i) => (
              <filter key={`glow-${i}`} id={`hglow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={color} floodOpacity="0.45" />
              </filter>
            ))}
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

          {/* Hexagons — render hovered/selected last so they sit on top */}
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

            return (
              <g
                key={`h-${i}`}
                transform={`translate(${pos.x},${pos.y})`}
                onClick={() => setSelectedZone(isSel ? null : i)}
                onMouseEnter={() => setHoveredZone(i)}
                onMouseLeave={() => setHoveredZone(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Inner group for scale transform — scales from center of hex */}
                <g
                  className="hex-pop"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "0 0",
                    transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                >
                {/* Zone image clipped to hex */}
                <g clipPath={`url(#hclip-${i})`}>
                  <image
                    href={ZONE_IMAGES[i]}
                    x={-S} y={-S} width={S * 2} height={S * 2}
                    preserveAspectRatio="xMidYMid slice"
                    opacity={active ? 0.5 : 0.2}
                    style={{ transition: "opacity 0.3s ease" }}
                  />
                  <path
                    d={hexClip}
                    fill="#06080D"
                    opacity={active ? 0.3 : 0.6}
                    style={{ transition: "opacity 0.3s ease" }}
                  />
                </g>

                {/* Hex border */}
                <path
                  d={hexOutline}
                  fill="none"
                  stroke={ZONE_COLORS[i]}
                  strokeWidth={isSel ? 2.5 : isHov ? 2 : 1}
                  strokeOpacity={isSel ? 0.9 : isHov ? 0.7 : 0.2 + intensity * 0.25}
                  filter={active ? `url(#hglow-${i})` : undefined}
                  style={{ transition: "all 0.3s ease" }}
                />

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

                {/* Zone name (trimmed) */}
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

                {/* Pulse on occupied hexes */}
                {count > 0 && (
                  <path
                    d={hexPath(S + 3)}
                    fill="none"
                    stroke={ZONE_COLORS[i]}
                    strokeWidth={0.5}
                    strokeOpacity={0.15}
                  >
                    <animate
                      attributeName="stroke-opacity"
                      values="0.1;0.3;0.1"
                      dur={`${3 + i * 0.4}s`}
                      repeatCount="indefinite"
                    />
                  </path>
                )}
                </g>
              </g>
            );
          })}
        </svg>

        {/* Zone detail panel */}
        {selectedZone !== null && (
          <div
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
                            style={{ fontFamily: "monospace", minWidth: 70, textAlign: "right", color: "#ECC94B" }}
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
