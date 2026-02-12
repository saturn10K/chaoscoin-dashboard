"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentProfile } from "../hooks/useAgents";
import type { SabotageEvent } from "../hooks/useSabotage";
import type { Alliance } from "../hooks/useSocialFeed";
import { ZONE_COLORS, ZONE_NAMES } from "../lib/constants";

interface RivalryGraphProps {
  agents: AgentProfile[];
  sabotageEvents: SabotageEvent[];
  alliances: Alliance[];
}

interface NodePos {
  agentId: string;
  x: number;
  y: number;
  zone: number;
  hashrate: number;
  radius: number;
}

interface AttackLine {
  id: string;
  from: string;
  to: string;
  type: string;
  timestamp: number;
  damage: number;
}

// Layout agents in a circle grouped roughly by zone
function computeLayout(agents: AgentProfile[], width: number, height: number): NodePos[] {
  if (agents.length === 0) return [];

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.36;

  // Sort by zone for grouping
  const sorted = [...agents].sort((a, b) => a.zone - b.zone);

  return sorted.map((agent, i) => {
    const angle = (i / sorted.length) * Math.PI * 2 - Math.PI / 2;
    const hashrate = parseFloat(agent.hashrate) || 1;
    const nodeRadius = Math.max(5, Math.min(14, 4 + Math.sqrt(hashrate) * 0.8));

    // Add slight randomness so nodes don't stack perfectly
    const jitterX = (Math.sin(parseInt(agent.agentId) * 7.3) * 8);
    const jitterY = (Math.cos(parseInt(agent.agentId) * 11.1) * 8);

    return {
      agentId: agent.agentId,
      x: cx + Math.cos(angle) * radius + jitterX,
      y: cy + Math.sin(angle) * radius + jitterY,
      zone: agent.zone,
      hashrate,
      radius: nodeRadius,
    };
  });
}

const ATTACK_DECAY_MS = 30_000; // Attacks visible for 30s

export default function RivalryGraph({ agents, sabotageEvents, alliances }: RivalryGraphProps) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [, forceUpdate] = useState(0);

  // Force re-render to age out attack lines
  useEffect(() => {
    const timer = setInterval(() => forceUpdate((v) => v + 1), 2000);
    return () => clearInterval(timer);
  }, []);

  const W = 400;
  const H = 260;

  const nodes = useMemo(() => computeLayout(agents, W, H), [agents]);
  const nodeMap = useMemo(() => {
    const map = new Map<string, NodePos>();
    for (const n of nodes) map.set(n.agentId, n);
    return map;
  }, [nodes]);

  // Recent attack lines
  const attackLines = useMemo<AttackLine[]>(() => {
    const now = Date.now();
    return sabotageEvents
      .filter((e) => now - e.timestamp < ATTACK_DECAY_MS)
      .map((e) => ({
        id: e.id,
        from: String(e.attackerAgentId),
        to: String(e.targetAgentId),
        type: e.type,
        timestamp: e.timestamp,
        damage: e.damage,
      }));
  }, [sabotageEvents]);

  // Active alliances
  const allianceLines = useMemo(() => {
    return alliances
      .filter((a) => a.active)
      .map((a) => ({
        id: a.id,
        from: String(a.members[0]),
        to: String(a.members[1]),
        strength: a.strength,
      }));
  }, [alliances]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const hoveredNode = hoveredAgent ? nodeMap.get(hoveredAgent) : null;
  const hoveredAgentData = hoveredAgent ? agents.find((a) => a.agentId === hoveredAgent) : null;

  return (
    <div
      className="rounded-lg border border-white/10 overflow-hidden"
      style={{ backgroundColor: "#0D1117" }}
    >
      <div
        className="px-3 py-2 border-b border-white/10 flex items-center justify-between"
        style={{ backgroundColor: "#06080D" }}
      >
        <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#7B61FF" }}>
          Rivalry Network
        </h2>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 rounded" style={{ backgroundColor: "#00E5A0" }} />
            Alliance
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 rounded" style={{ backgroundColor: "#FF4444" }} />
            Attack
          </span>
        </div>
      </div>

      <div className="relative" onMouseMove={handleMouseMove}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 220 }}
        >
          <defs>
            {/* Glow filter for attack lines */}
            <filter id="attack-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Alliance lines (green, gentle) */}
          {allianceLines.map((line) => {
            const fromNode = nodeMap.get(line.from);
            const toNode = nodeMap.get(line.to);
            if (!fromNode || !toNode) return null;
            const isHighlighted = hoveredAgent === line.from || hoveredAgent === line.to;
            return (
              <line
                key={`alliance-${line.id}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#00E5A0"
                strokeWidth={isHighlighted ? 2 : 1}
                strokeOpacity={isHighlighted ? 0.7 : 0.2}
                strokeDasharray="4 4"
                style={{ transition: "stroke-opacity 0.3s, stroke-width 0.3s" }}
              >
                <animate
                  attributeName="stroke-dashoffset"
                  values="0;-8"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </line>
            );
          })}

          {/* Attack lines (red, animated) */}
          {attackLines.map((line) => {
            const fromNode = nodeMap.get(line.from);
            const toNode = nodeMap.get(line.to);
            if (!fromNode || !toNode) return null;

            const age = (Date.now() - line.timestamp) / ATTACK_DECAY_MS;
            const opacity = Math.max(0, 1 - age);

            return (
              <g key={`attack-${line.id}`}>
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="#FF4444"
                  strokeWidth={2}
                  strokeOpacity={opacity * 0.6}
                  filter="url(#attack-glow)"
                  strokeDasharray="6 3"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    values="0;-18"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </line>
                {/* Impact circle at target */}
                <circle
                  cx={toNode.x}
                  cy={toNode.y}
                  fill="none"
                  stroke="#FF4444"
                  strokeWidth={1}
                >
                  <animate
                    attributeName="r"
                    values={`${toNode.radius};${toNode.radius + 12}`}
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="stroke-opacity"
                    values={`${opacity * 0.5};0`}
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}

          {/* Agent nodes */}
          {nodes.map((node) => {
            const isHovered = hoveredAgent === node.agentId;
            const isConnected =
              attackLines.some((l) => l.from === node.agentId || l.to === node.agentId) ||
              allianceLines.some((l) => l.from === node.agentId || l.to === node.agentId);
            const zoneColor = ZONE_COLORS[node.zone] || "#666";

            return (
              <g
                key={`node-${node.agentId}`}
                onMouseEnter={() => setHoveredAgent(node.agentId)}
                onMouseLeave={() => setHoveredAgent(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Outer glow ring */}
                {(isHovered || isConnected) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius + 4}
                    fill="none"
                    stroke={zoneColor}
                    strokeWidth={1}
                    strokeOpacity={isHovered ? 0.6 : 0.2}
                    filter={isHovered ? "url(#node-glow)" : undefined}
                  />
                )}
                {/* Main circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered ? node.radius + 2 : node.radius}
                  fill={`${zoneColor}${isHovered ? "CC" : "80"}`}
                  stroke={zoneColor}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeOpacity={isHovered ? 1 : 0.5}
                  style={{ transition: "r 0.2s, fill 0.2s" }}
                />
                {/* Agent ID label */}
                {(isHovered || node.radius >= 8) && (
                  <text
                    x={node.x}
                    y={node.y + 3}
                    textAnchor="middle"
                    fill="white"
                    fontSize={isHovered ? 9 : 7}
                    fontWeight="bold"
                    fontFamily="monospace"
                    style={{ pointerEvents: "none" }}
                  >
                    {node.agentId}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredNode && hoveredAgentData && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute z-10 pointer-events-none rounded-lg px-3 py-2 border"
              style={{
                left: Math.min(tooltipPos.x + 12, W - 150),
                top: tooltipPos.y - 40,
                backgroundColor: "#0D1117F0",
                borderColor: `${ZONE_COLORS[hoveredNode.zone]}40`,
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="text-xs font-bold text-gray-100" style={{ fontFamily: "monospace" }}>
                Agent #{hoveredAgentData.agentId}
              </div>
              <div className="text-[10px] text-gray-400 flex gap-3 mt-0.5">
                <span>
                  <span style={{ color: ZONE_COLORS[hoveredNode.zone] }}>
                    {ZONE_NAMES[hoveredNode.zone]?.replace("The ", "")}
                  </span>
                </span>
                <span>
                  <span style={{ color: "#00E5A0" }}>{hoveredAgentData.hashrate} H/s</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
