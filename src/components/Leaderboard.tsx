"use client";

import { useState, useMemo } from "react";
import { ZONE_NAMES, PIONEER_BADGES } from "../lib/constants";
import { useAlliances } from "../hooks/useSocialFeed";
import BadgeTooltip, { BADGE_INFO } from "./BadgeTooltip";

function formatNumber(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompact(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(1);
}

interface Agent {
  agentId: string;
  hashrate: string;
  totalMined: string;
  zone: number;
  cosmicResilience: string;
  active: boolean;
  pioneerPhase: number;
  lastHeartbeat: string;
}

interface LeaderboardProps {
  agents: Agent[];
  currentBlock?: bigint;
  onSelectAgent?: (agentId: number) => void;
}

// Compute a granular status from on-chain data
// Monad produces ~2-4 blocks/s, so 1000 blocks ~ 4-8 minutes.
// Agent cycle is 90s, so ~200-400 blocks between heartbeats.
// HEARTBEAT_INTERVAL = 100,000 blocks (~8-14 hours), TIMEOUT = 2x = 200,000 blocks
type AgentStatus = "mining" | "idle" | "stale" | "hibernated";

function getAgentStatus(agent: Agent, currentBlock?: bigint): AgentStatus {
  if (!agent.active) return "hibernated";
  if (!currentBlock || currentBlock === 0n) return "mining"; // no block data yet

  const lastHb = BigInt(agent.lastHeartbeat || "0");
  if (lastHb === 0n) return "hibernated";

  const blocksSinceHeartbeat = currentBlock - lastHb;

  // Mining: heartbeat within last 500 blocks
  if (blocksSinceHeartbeat < 500n) return "mining";
  // Idle: no heartbeat in last 500 but within last 10,000 blocks
  if (blocksSinceHeartbeat < 10_000n) return "idle";
  // Stale: heartbeat older than 1 interval but contract hasn't pruned yet
  return "stale";
}

const STATUS_CONFIG: Record<AgentStatus, { color: string; label: string }> = {
  mining: { color: "#00E5A0", label: "Mining" },
  idle: { color: "#F59E0B", label: "Idle" },
  stale: { color: "#EF4444", label: "Stale" },
  hibernated: { color: "#6B7280", label: "Hibernated" },
};

type SortKey = "hashrate" | "totalMined" | "resilience";

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: "hashrate", label: "Hashrate" },
  { key: "totalMined", label: "Mined" },
  { key: "resilience", label: "Resilience" },
];

function rankColor(idx: number): string {
  if (idx === 0) return "#ECC94B";
  if (idx === 1) return "#A0AEC0";
  if (idx === 2) return "#ED8936";
  return "#6B7280";
}

export default function Leaderboard({ agents, currentBlock, onSelectAgent }: LeaderboardProps) {
  const [sortBy, setSortBy] = useState<SortKey>("hashrate");
  const { alliances } = useAlliances();

  // Build alliance partner map for badge display
  const alliancePartners = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const a of alliances) {
      if (!a.active) continue;
      const [a1, a2] = a.members;
      map.set(a1, [...(map.get(a1) || []), a2]);
      map.set(a2, [...(map.get(a2) || []), a1]);
    }
    return map;
  }, [alliances]);

  const sorted = useMemo(() => {
    const copy = [...agents];
    copy.sort((a, b) => {
      switch (sortBy) {
        case "hashrate":
          return parseFloat(b.hashrate) - parseFloat(a.hashrate);
        case "totalMined":
          return parseFloat(b.totalMined) - parseFloat(a.totalMined);
        case "resilience":
          return parseFloat(b.cosmicResilience) - parseFloat(a.cosmicResilience);
        default:
          return 0;
      }
    });
    return copy;
  }, [agents, sortBy]);

  // Shared badge renderer for both layouts
  const renderBadges = (agent: Agent) => (
    <>
      {agent.pioneerPhase > 0 && (
        <BadgeTooltip
          title={BADGE_INFO.pioneer[agent.pioneerPhase]?.title || `Pioneer P${agent.pioneerPhase}`}
          description={BADGE_INFO.pioneer[agent.pioneerPhase]?.description || `Registered during Phase ${agent.pioneerPhase}.`}
          color="#7B61FF"
        >
          <span
            className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold whitespace-nowrap"
            style={{
              backgroundColor: "#7B61FF20",
              color: "#7B61FF",
              border: "1px solid #7B61FF40",
            }}
          >
            {PIONEER_BADGES[agent.pioneerPhase] && (
              <img src={PIONEER_BADGES[agent.pioneerPhase]!} alt="" className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            )}
            P{agent.pioneerPhase}
          </span>
        </BadgeTooltip>
      )}
      {alliancePartners.has(parseInt(agent.agentId)) && (
        <BadgeTooltip
          title="Allied"
          description={`Allied with Agent${(alliancePartners.get(parseInt(agent.agentId)) || []).length > 1 ? "s" : ""} ${(alliancePartners.get(parseInt(agent.agentId)) || []).map(p => `#${p}`).join(", ")}. Allied agents share intelligence and coordinate strategies.`}
          color="#00E5A0"
        >
          <span
            className="inline-flex items-center px-1 py-0.5 rounded text-[10px]"
            style={{
              background: "rgba(0,229,160,0.1)",
              color: "#00E5A0",
              border: "1px solid rgba(0,229,160,0.25)",
            }}
          >
            🤝
          </span>
        </BadgeTooltip>
      )}
    </>
  );

  const renderStatus = (agent: Agent) => {
    const status = getAgentStatus(agent, currentBlock);
    const cfg = STATUS_CONFIG[status];
    return (
      <BadgeTooltip
        title={cfg.label}
        description={BADGE_INFO.status[status] || `Agent is ${status}.`}
        color={cfg.color}
      >
        <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: cfg.color,
              boxShadow: status === "mining" ? `0 0 6px ${cfg.color}` : undefined,
            }}
          />
          <span style={{ color: cfg.color }}>{cfg.label}</span>
        </span>
      </BadgeTooltip>
    );
  };

  return (
    <div
      className="rounded-lg border border-white/10 overflow-hidden glow-border"
      style={{ backgroundColor: "#0D1117" }}
    >
      {/* Header with sort tabs */}
      <div
        className="px-3 sm:px-4 py-2.5 border-b border-white/10 flex items-center gap-2 sm:gap-4"
        style={{ backgroundColor: "#06080D" }}
      >
        <h2
          className="text-xs sm:text-sm font-semibold tracking-wide uppercase flex-shrink-0"
          style={{ color: "#7B61FF" }}
        >
          Leaderboard
        </h2>
        <div className="ml-auto flex gap-1">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSortBy(tab.key)}
              className="px-1.5 sm:px-2.5 py-1 rounded text-[10px] sm:text-xs font-medium transition-colors btn-press tab-btn"
              style={{
                backgroundColor:
                  sortBy === tab.key ? "#7B61FF20" : "transparent",
                color: sortBy === tab.key ? "#7B61FF" : "#6B7280",
                border:
                  sortBy === tab.key
                    ? "1px solid #7B61FF40"
                    : "1px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Desktop table (hidden on mobile) ─── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Agent ID
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hashrate
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Mined
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resilience
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Zone
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No agents registered yet
                </td>
              </tr>
            )}
            {sorted.map((agent, idx) => (
              <tr
                key={agent.agentId}
                className="hover:bg-white/[0.04] transition-colors cursor-pointer row-hover"
                onClick={() => onSelectAgent?.(parseInt(agent.agentId))}
              >
                {/* Rank */}
                <td className="px-4 py-2.5">
                  <span
                    className="text-xs font-bold"
                    style={{ fontFamily: "monospace", color: rankColor(idx) }}
                  >
                    {idx + 1}
                  </span>
                </td>

                {/* Agent ID + Badges */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-sm text-gray-200"
                      style={{ fontFamily: "monospace" }}
                    >
                      #{agent.agentId}
                    </span>
                    {renderBadges(agent)}
                  </div>
                </td>

                {/* Hashrate */}
                <td className="px-4 py-2.5 text-right">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#00E5A0", fontFamily: "monospace" }}
                  >
                    {formatNumber(agent.hashrate)}
                  </span>
                </td>

                {/* Total Mined */}
                <td className="px-4 py-2.5 text-right">
                  <span
                    className="text-sm text-gray-300"
                    style={{ fontFamily: "monospace" }}
                  >
                    {formatNumber(agent.totalMined)}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">CHAOS</span>
                </td>

                {/* Resilience */}
                <td className="px-4 py-2.5 text-right">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#60A5FA", fontFamily: "monospace" }}
                  >
                    {formatNumber(agent.cosmicResilience)}
                  </span>
                </td>

                {/* Zone */}
                <td className="px-4 py-2.5">
                  <span className="text-xs text-gray-400">
                    {ZONE_NAMES[agent.zone] || `Zone ${agent.zone}`}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-2.5 text-center">
                  {renderStatus(agent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Mobile card layout (hidden on desktop) ─── */}
      <div className="md:hidden divide-y divide-white/5">
        {sorted.length === 0 && (
          <div className="px-3 py-8 text-center text-gray-500 text-sm">
            No agents registered yet
          </div>
        )}
        {sorted.map((agent, idx) => {
          const status = getAgentStatus(agent, currentBlock);
          const cfg = STATUS_CONFIG[status];
          return (
            <div
              key={agent.agentId}
              className="px-3 py-3 active:bg-white/[0.04] transition-colors cursor-pointer row-hover"
              onClick={() => onSelectAgent?.(parseInt(agent.agentId))}
            >
              {/* Row 1: Rank + Agent ID + Badges + Status */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Rank */}
                <span
                  className="text-xs font-bold flex-shrink-0 w-5 text-center"
                  style={{ fontFamily: "monospace", color: rankColor(idx) }}
                >
                  {idx + 1}
                </span>

                {/* Agent ID */}
                <span
                  className="text-sm text-gray-200 flex-shrink-0"
                  style={{ fontFamily: "monospace" }}
                >
                  #{agent.agentId}
                </span>

                {/* Badges — flex-wrap so they don't overflow */}
                <div className="flex items-center gap-1 flex-wrap min-w-0">
                  {renderBadges(agent)}
                </div>

                {/* Status — pushed right */}
                <div className="ml-auto flex-shrink-0">
                  {renderStatus(agent)}
                </div>
              </div>

              {/* Row 2: Stats grid */}
              <div className="flex items-center gap-3 mt-2 ml-5 text-[11px]">
                {/* Hashrate */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">H/s</span>
                  <span style={{ color: "#00E5A0", fontFamily: "monospace" }}>
                    {formatCompact(agent.hashrate)}
                  </span>
                </div>

                {/* Total Mined */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Mined</span>
                  <span className="text-gray-300" style={{ fontFamily: "monospace" }}>
                    {formatCompact(agent.totalMined)}
                  </span>
                </div>

                {/* Resilience */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Res</span>
                  <span style={{ color: "#60A5FA", fontFamily: "monospace" }}>
                    {formatCompact(agent.cosmicResilience)}
                  </span>
                </div>

                {/* Zone — truncated */}
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-gray-500 truncate" style={{ maxWidth: 80 }}>
                    {ZONE_NAMES[agent.zone]?.replace("The ", "") || `Z${agent.zone}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
