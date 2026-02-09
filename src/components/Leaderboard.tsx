"use client";

import { useState, useMemo } from "react";
import { ZONE_NAMES, PIONEER_BADGES } from "../lib/constants";

function formatNumber(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
// Monad produces ~2-4 blocks/s, so 1000 blocks ≈ 4-8 minutes.
// Agent cycle is 90s, so ~200-400 blocks between heartbeats.
// HEARTBEAT_INTERVAL = 100,000 blocks (~8-14 hours), TIMEOUT = 2× = 200,000 blocks
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
  { key: "totalMined", label: "Total Mined" },
  { key: "resilience", label: "Resilience" },
];

export default function Leaderboard({ agents, currentBlock, onSelectAgent }: LeaderboardProps) {
  const [sortBy, setSortBy] = useState<SortKey>("hashrate");

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

  return (
    <div
      className="rounded-lg border border-white/10 overflow-hidden"
      style={{ backgroundColor: "#0D1117" }}
    >
      {/* Header with sort tabs */}
      <div
        className="px-4 py-2.5 border-b border-white/10 flex items-center gap-4"
        style={{ backgroundColor: "#06080D" }}
      >
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ color: "#7B61FF" }}
        >
          Leaderboard
        </h2>
        <div className="ml-auto flex gap-1">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSortBy(tab.key)}
              className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
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

      {/* Table */}
      <div className="overflow-x-auto">
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
                className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                onClick={() => onSelectAgent?.(parseInt(agent.agentId))}
              >
                {/* Rank */}
                <td className="px-4 py-2.5">
                  <span
                    className="text-xs font-bold"
                    style={{
                      fontFamily: "monospace",
                      color:
                        idx === 0
                          ? "#ECC94B"
                          : idx === 1
                          ? "#A0AEC0"
                          : idx === 2
                          ? "#ED8936"
                          : "#6B7280",
                    }}
                  >
                    {idx + 1}
                  </span>
                </td>

                {/* Agent ID */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm text-gray-200"
                      style={{ fontFamily: "monospace" }}
                    >
                      #{agent.agentId}
                    </span>
                    {agent.pioneerPhase > 0 && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold"
                        style={{
                          backgroundColor: "#7B61FF20",
                          color: "#7B61FF",
                          border: "1px solid #7B61FF40",
                        }}
                      >
                        {PIONEER_BADGES[agent.pioneerPhase] && (
                          <img src={PIONEER_BADGES[agent.pioneerPhase]!} alt="" className="w-3.5 h-3.5" />
                        )}
                        P{agent.pioneerPhase}
                      </span>
                    )}
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
                  {(() => {
                    const status = getAgentStatus(agent, currentBlock);
                    const cfg = STATUS_CONFIG[status];
                    return (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: cfg.color,
                            boxShadow: status === "mining" ? `0 0 6px ${cfg.color}` : undefined,
                          }}
                        />
                        <span style={{ color: cfg.color }}>{cfg.label}</span>
                      </span>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
