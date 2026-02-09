"use client";

import { ZONE_NAMES } from "../lib/constants";

function formatNumber(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface AgentCardProps {
  agentId: string;
  hashrate: string;
  zone: number;
  pioneerPhase: number;
  active: boolean;
  totalMined: string;
}

export default function AgentCard({
  agentId,
  hashrate,
  zone,
  pioneerPhase,
  active,
  totalMined,
}: AgentCardProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border px-4 transition-colors"
      style={{
        width: 320,
        height: 72,
        backgroundColor: "#0D1117",
        borderColor: active ? "#7B61FF30" : "#FFFFFF10",
      }}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            backgroundColor: active ? "#00E5A0" : "#4A5568",
            boxShadow: active ? "0 0 6px #00E5A040" : "none",
          }}
        />
      </div>

      {/* Agent info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold text-gray-200"
            style={{ fontFamily: "monospace" }}
          >
            #{agentId}
          </span>
          {pioneerPhase > 0 && (
            <span
              className="px-1.5 py-0.5 rounded text-xs font-bold leading-none"
              style={{
                backgroundColor: "#7B61FF20",
                color: "#7B61FF",
                border: "1px solid #7B61FF40",
                fontSize: 10,
              }}
            >
              PIONEER P{pioneerPhase}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">
            {ZONE_NAMES[zone] || `Zone ${zone}`}
          </span>
          <span className="text-xs text-gray-700">|</span>
          <span className="text-xs text-gray-500">
            {active ? "Active" : "Hibernated"}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex-shrink-0 text-right">
        <div
          className="text-sm font-bold"
          style={{ color: "#00E5A0", fontFamily: "monospace" }}
        >
          {formatNumber(hashrate)}
          <span className="text-xs text-gray-500 font-normal ml-0.5">H/s</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "monospace" }}>
          {formatNumber(totalMined)} mined
        </div>
      </div>
    </div>
  );
}
