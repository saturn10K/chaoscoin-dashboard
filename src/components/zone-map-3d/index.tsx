"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
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
} from "@/lib/constants";

import { useZoneEvents } from "./use-zone-events";
import SceneSetup from "./SceneSetup";
import CameraController from "./CameraController";
import Starfield from "./Starfield";
import ZonePlatform from "./ZonePlatform";
import ZoneLabel from "./ZoneLabel";
import ZoneParticles from "./ZoneParticles";
import ConnectionBeams from "./ConnectionBeams";
import WarfareEffects from "./WarfareEffects";
import CosmicShockwaveEffect from "./CosmicShockwaveEffect";
import ActivityBursts from "./ActivityBursts";
import SocialFlashEffect from "./SocialFlashEffect";
import PostProcessing from "./PostProcessing";
import { HEX_WORLD_POSITIONS } from "./hex-geometry";
import type { ZoneMapProps, ZoneStats, ZoneData } from "./types";

// ── Performance tier detection ──────────────────────────────────────────
function getPerformanceTier(): "high" | "mid" | "low" {
  if (typeof navigator === "undefined") return "mid";
  const cores = navigator.hardwareConcurrency || 2;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  if (isMobile || cores <= 2) return "low";
  if (cores <= 4) return "mid";
  return "high";
}

const PERF = getPerformanceTier();
const STAR_COUNT = PERF === "high" ? 1500 : PERF === "mid" ? 800 : 300;
const MAX_PARTICLES = PERF === "low" ? 2 : PERF === "mid" ? 4 : 6;
const BLOOM_ENABLED = PERF !== "low";
const VIGNETTE_ENABLED = PERF === "high";
const DPR: [number, number] = PERF === "high" ? [1, 2] : PERF === "mid" ? [1, 1.5] : [1, 1];

// ── Helpers ─────────────────────────────────────────────────────────────
function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-xs font-bold" style={{ color, fontFamily: "monospace" }}>{value}</div>
      <div className="text-xs text-gray-600 mt-0.5" style={{ fontSize: 9 }}>{label}</div>
    </div>
  );
}

function riskColor(risk: string) {
  if (risk === "Very High") return "#FF4444";
  if (risk === "High") return "#ED8936";
  if (risk === "Medium") return "#ECC94B";
  return "#48BB78";
}

// ── Main component ──────────────────────────────────────────────────────
export default function ZoneMap3D({
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

  // Zone stats computation (identical to SVG ZoneMap)
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

  const totalHashrate = useMemo(
    () => zoneStats.reduce((s, z) => s + z.totalHashrate, 0) || 1,
    [zoneStats],
  );

  // Event tracking (warfare lines, sparks, cosmic shockwaves)
  const { warfareLines, activitySparks, cosmicShockwave } = useZoneEvents(
    sabotageEvents,
    cosmicEvents,
    agents,
  );

  // Build zone data array for 3D scene
  const zones: ZoneData[] = useMemo(
    () =>
      HEX_WORLD_POSITIONS.map((pos, i) => ({
        index: i,
        position: pos,
        color: ZONE_COLORS[i],
        name: ZONE_NAMES[i],
        modifier: ZONE_MODIFIERS[i],
        risk: ZONE_RISK[i],
        image: ZONE_IMAGES[i],
        agentCount: zoneCounts[i] || 0,
        hashShare: zoneStats[i].totalHashrate / totalHashrate,
        totalHashrate: zoneStats[i].totalHashrate,
        totalMined: zoneStats[i].totalMined,
        avgHashrate: zoneStats[i].avgHashrate,
        shielded: zoneStats[i].shielded,
        agents: zoneStats[i].agents,
      })),
    [zoneCounts, zoneStats, totalHashrate],
  );

  const handleZoneSelect = useCallback(
    (idx: number) => setSelectedZone((prev) => (prev === idx ? null : idx)),
    [],
  );

  return (
    <div
      className="rounded-lg border border-white/10 overflow-hidden"
      style={{ backgroundColor: "#0D1117" }}
    >
      {/* ── Header ── */}
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
        {/* ── 3D Canvas ── */}
        <div style={{ height: 380, position: "relative", borderRadius: 8, overflow: "hidden" }}>
          <Canvas
            camera={{ position: [0, 8, 12], fov: 45, near: 0.1, far: 200 }}
            dpr={DPR}
            gl={{ antialias: PERF !== "low", alpha: false, powerPreference: "high-performance" }}
            style={{ background: "#0D1117" }}
            onPointerMissed={() => setSelectedZone(null)}
          >
            <Suspense fallback={null}>
              <SceneSetup />
              <Starfield count={STAR_COUNT} />

              <ConnectionBeams
                zones={zones}
                selectedZone={selectedZone}
                hoveredZone={hoveredZone}
              />

              {zones.map((zone) => (
                <ZonePlatform
                  key={zone.index}
                  zone={zone}
                  isSelected={selectedZone === zone.index}
                  isHovered={hoveredZone === zone.index}
                  onSelect={() => handleZoneSelect(zone.index)}
                  onHover={(hovered) => setHoveredZone(hovered ? zone.index : null)}
                />
              ))}

              {zones.map((zone) => (
                <ZoneLabel
                  key={`label-${zone.index}`}
                  zone={zone}
                  isSelected={selectedZone === zone.index}
                  isHovered={hoveredZone === zone.index}
                />
              ))}

              {zones.map((zone) => (
                <ZoneParticles
                  key={`particles-${zone.index}`}
                  position={zone.position}
                  agentCount={zone.agentCount}
                  zoneIndex={zone.index}
                  color={zone.color}
                  maxParticles={MAX_PARTICLES}
                />
              ))}

              <WarfareEffects lines={warfareLines} zones={zones} />
              <CosmicShockwaveEffect shockwave={cosmicShockwave} zones={zones} />
              <ActivityBursts sparks={activitySparks} zones={zones} />
              <SocialFlashEffect pulsingZones={pulsingZones} zones={zones} />

              <CameraController selectedZone={selectedZone} zones={zones} />
              <PostProcessing bloomEnabled={BLOOM_ENABLED} vignetteEnabled={VIGNETTE_ENABLED} />
            </Suspense>
          </Canvas>
        </div>

        {/* ── Zone detail panel (identical HTML from SVG ZoneMap) ── */}
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
              {/* Hero image */}
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

              {/* Stats row */}
              <div className="p-3 grid grid-cols-4 gap-2 border-b border-white/5">
                <StatBox label="Agents" value={String(zoneCounts[selectedZone] || 0)} color={ZONE_COLORS[selectedZone]} />
                <StatBox label="Hashrate" value={`${zoneStats[selectedZone].totalHashrate} H/s`} color="#00E5A0" />
                <StatBox label="Total Mined" value={formatCompact(zoneStats[selectedZone].totalMined)} color="#ECC94B" />
                <StatBox label="Shielded" value={`${zoneStats[selectedZone].shielded}/${zoneCounts[selectedZone] || 0}`} color="#3498DB" />
              </div>

              {/* Info section */}
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

              {/* Agent list */}
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

        {/* ── Zone legend (when nothing selected) ── */}
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
