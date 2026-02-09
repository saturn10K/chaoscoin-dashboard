"use client";

import { useSabotage, SabotageEvent, NegotiationEvent } from "../hooks/useSabotage";
import { ZONE_NAMES, ZONE_COLORS } from "../lib/constants";

const ATTACK_ICONS: Record<string, string> = {
  facility_raid: "🏚️",
  rig_jam: "⚙️",
  intel_gathering: "🔍",
};

const ATTACK_LABELS: Record<string, string> = {
  facility_raid: "Facility Raid",
  rig_jam: "Rig Jam",
  intel_gathering: "Intel Gathering",
};

const ATTACK_COLORS: Record<string, string> = {
  facility_raid: "#FF4444",
  rig_jam: "#FF6B35",
  intel_gathering: "#ECC94B",
};

const DEAL_ICONS: Record<string, string> = {
  rig_trade: "🔧",
  protection_pact: "🛡️",
  coordinated_attack: "⚔️",
  zone_migration: "🚀",
  revenue_share: "💰",
  information_exchange: "📡",
  alliance_proposal: "🤝",
  betrayal_conspiracy: "🗡️",
};

function formatChaos(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export default function SabotageLog() {
  const { events, negotiations, stats, loading } = useSabotage();

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <h2
        className="text-sm font-semibold mb-3 uppercase tracking-wider"
        style={{ color: "#FF4444" }}
      >
        Sabotage & Negotiations
      </h2>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <StatBox label="Attacks" value={stats.totalAttacks} color="#FF4444" />
          <StatBox label="Burned" value={formatChaos(stats.totalBurned)} color="#FF6B35" />
          <StatBox label="Deals" value={stats.negotiations.total} color="#7B61FF" />
          <StatBox
            label="Accept%"
            value={`${stats.negotiations.acceptRate}%`}
            color="#00E5A0"
          />
        </div>
      )}

      {/* Sabotage Events */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Recent Attacks
        </div>
        {events.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-3">
            {loading ? "Loading sabotage data..." : "No attacks yet... peace won't last."}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {events.slice(0, 12).map(evt => (
              <AttackRow key={evt.id} event={evt} />
            ))}
          </div>
        )}
      </div>

      {/* Negotiations */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Recent Negotiations
        </div>
        {negotiations.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-3">
            No deals proposed yet...
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {negotiations.slice(0, 8).map(neg => (
              <NegotiationRow key={neg.id} negotiation={neg} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AttackRow({ event }: { event: SabotageEvent }) {
  const icon = ATTACK_ICONS[event.type] || "💥";
  const label = ATTACK_LABELS[event.type] || event.type;
  const color = ATTACK_COLORS[event.type] || "#FF4444";
  const zoneName = ZONE_NAMES[event.zone] || `Zone ${event.zone}`;
  const zoneColor = ZONE_COLORS[event.zone] || "#7F8C8D";

  return (
    <div
      className="rounded p-2"
      style={{ background: "rgba(255,255,255,0.03)", borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span>{icon}</span>
          <span className="text-xs font-medium" style={{ color }}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-1 py-0.5 rounded"
            style={{ background: `${zoneColor}20`, color: zoneColor }}
          >
            {zoneName.replace("The ", "")}
          </span>
          <span className="text-xs text-gray-600">{timeAgo(event.timestamp)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          <span className="text-red-400">#{event.attackerAgentId}</span>
          {" → "}
          <span className="text-gray-300">#{event.targetAgentId}</span>
        </span>
        <div className="flex items-center gap-2">
          {event.damage > 0 && (
            <span className="text-red-400">-{event.damage}% dmg</span>
          )}
          {event.shieldReduction > 0 && (
            <span className="text-blue-400">🛡️-{event.shieldReduction}%</span>
          )}
          <span className="font-mono text-orange-400">
            🔥{formatChaos(event.burned)}
          </span>
        </div>
      </div>
      {event.narrative && (
        <p className="text-xs text-gray-500 mt-1 italic leading-snug">
          {event.narrative}
        </p>
      )}
    </div>
  );
}

function NegotiationRow({ negotiation }: { negotiation: NegotiationEvent }) {
  const icon = DEAL_ICONS[negotiation.type] || "📋";
  const outcomeColor =
    negotiation.outcome === "accepted" ? "#00E5A0" :
    negotiation.outcome === "rejected" ? "#FF4444" : "#6B7280";
  const outcomeLabel =
    negotiation.outcome === "accepted" ? "ACCEPTED" :
    negotiation.outcome === "rejected" ? "REJECTED" : "EXPIRED";

  return (
    <div
      className="rounded p-2"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span>{icon}</span>
          <span className="text-xs text-gray-400">
            #{negotiation.proposerAgentId} → #{negotiation.targetAgentId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ background: `${outcomeColor}20`, color: outcomeColor }}
          >
            {outcomeLabel}
          </span>
          <span className="text-xs text-gray-600">{timeAgo(negotiation.timestamp)}</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 leading-snug line-clamp-2">
        {negotiation.terms}
      </p>
      {negotiation.response && (
        <p className="text-xs text-gray-500 mt-0.5 italic leading-snug line-clamp-1">
          &ldquo;{negotiation.response}&rdquo;
        </p>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded p-2 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="text-lg font-bold" style={{ color, fontFamily: "monospace" }}>
        {value}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
