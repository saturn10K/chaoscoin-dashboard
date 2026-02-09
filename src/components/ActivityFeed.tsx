"use client";

import { useState, useEffect, useMemo } from "react";
import { useActivityFeed, ActivityItem } from "../hooks/useActivityFeed";
import { useAlliances, Alliance, AllianceEvent } from "../hooks/useSocialFeed";
import { useSabotage, SabotageEvent, NegotiationEvent } from "../hooks/useSabotage";
import { publicClient } from "../lib/contracts";
import { ZONE_NAMES, ZONE_COLORS } from "../lib/constants";

// ── On-chain event styling ───────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  Register: "#7B61FF",
  Heartbeat: "#6B7280",
  Reward: "#00E5A0",
  "Rig Buy": "#ECC94B",
  "Rig Equip": "#48BB78",
  Facility: "#7B61FF",
  Shield: "#3498DB",
  Event: "#FF6B35",
  Migrate: "#ED8936",
  Alliance: "#00E5A0",
  Betrayal: "#FF4444",
  Dissolved: "#6C757D",
  Attack: "#FF4444",
  Deal: "#7B61FF",
};

const TYPE_ICONS: Record<string, string> = {
  Register: "/assets/icons/facility.png",
  Heartbeat: "/assets/icons/hashrate_indicator_green.png",
  Reward: "/assets/icons/hashrate_indicator_green.png",
  "Rig Buy": "/assets/rigs/potato-rig.png",
  "Rig Equip": "/assets/rigs/potato-rig.png",
  Facility: "/assets/icons/facility.png",
  Shield: "/assets/icons/shield_icon.png",
  Event: "/assets/icons/cosmic_event_warning.png",
  Migrate: "/assets/icons/zone_icon.png",
};

const ALLIANCE_EVENT_ICONS: Record<string, string> = {
  formed: "🤝",
  strengthened: "💪",
  weakened: "📉",
  betrayed: "🗡️",
  dissolved: "💔",
};
const ALLIANCE_EVENT_COLORS: Record<string, string> = {
  formed: "#00E5A0",
  strengthened: "#48BB78",
  weakened: "#ECC94B",
  betrayed: "#FF4444",
  dissolved: "#6C757D",
};

const ATTACK_ICONS: Record<string, string> = {
  facility_raid: "🏚️",
  rig_jam: "⚙️",
  intel_gathering: "🔍",
};
const ATTACK_LABELS: Record<string, string> = {
  facility_raid: "Facility Raid",
  rig_jam: "Rig Jam",
  intel_gathering: "Intel Gather",
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

// ── Helpers ──────────────────────────────────────────────────────────
const BLOCKS_PER_SECOND = 2.5;

function formatBlockTimeAgo(blockDiff: bigint): string {
  const seconds = Number(blockDiff) / BLOCKS_PER_SECOND;
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h ago`;
  return `${(seconds / 86400).toFixed(1)}d ago`;
}

function formatTimestampAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatChaos(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

// ── Unified feed item ────────────────────────────────────────────────
type FeedKind = "chain" | "alliance_event" | "sabotage" | "negotiation";

interface UnifiedItem {
  kind: FeedKind;
  sortKey: number;
  chainItem?: ActivityItem;
  allianceEvent?: AllianceEvent;
  sabotageEvent?: SabotageEvent;
  negotiation?: NegotiationEvent;
}

type FilterTab = "all" | "chain" | "alliances" | "combat";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "chain", label: "On-Chain" },
  { key: "alliances", label: "Alliances" },
  { key: "combat", label: "Combat" },
];

export default function ActivityFeed() {
  const { items: chainItems, loading: chainLoading } = useActivityFeed();
  const { alliances, events: allianceEvents, stats: allianceStats } = useAlliances();
  const { events: sabotageEvents, negotiations, stats: sabotageStats } = useSabotage();
  const [currentBlock, setCurrentBlock] = useState<bigint>(0n);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const block = await publicClient.getBlockNumber();
        setCurrentBlock(block);
      } catch {}
    };
    fetchBlock();
    const interval = setInterval(fetchBlock, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Merge everything into one timeline
  const unifiedItems = useMemo(() => {
    const items: UnifiedItem[] = [];

    // On-chain events
    if (filter === "all" || filter === "chain") {
      for (const ci of chainItems) {
        const blockDiff = currentBlock > 0n ? currentBlock - ci.blockNumber : 0n;
        const msAgo = (Number(blockDiff) / BLOCKS_PER_SECOND) * 1000;
        items.push({ kind: "chain", sortKey: Date.now() - msAgo, chainItem: ci });
      }
    }

    // Alliance events
    if (filter === "all" || filter === "alliances") {
      for (const evt of allianceEvents) {
        items.push({ kind: "alliance_event", sortKey: evt.timestamp, allianceEvent: evt });
      }
    }

    // Sabotage attacks
    if (filter === "all" || filter === "combat") {
      for (const evt of sabotageEvents) {
        items.push({ kind: "sabotage", sortKey: evt.timestamp, sabotageEvent: evt });
      }
    }

    // Negotiations
    if (filter === "all" || filter === "combat") {
      for (const neg of negotiations) {
        items.push({ kind: "negotiation", sortKey: neg.timestamp, negotiation: neg });
      }
    }

    items.sort((a, b) => b.sortKey - a.sortKey);
    return items.slice(0, 80);
  }, [chainItems, allianceEvents, sabotageEvents, negotiations, currentBlock, filter]);

  const activeAlliances = alliances.filter((a) => a.active);
  const loading = chainLoading && chainItems.length === 0;

  return (
    <div
      className="rounded-lg border border-white/10 overflow-hidden glow-border"
      style={{ backgroundColor: "#0D1117" }}
    >
      {/* Header */}
      <div
        className="px-3 sm:px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-2"
        style={{ backgroundColor: "#06080D" }}
      >
        <h2
          className="text-xs sm:text-sm font-semibold tracking-wide uppercase flex-shrink-0"
          style={{ color: "#7B61FF" }}
        >
          Activity Feed
        </h2>
        <div className="flex items-center gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium transition-colors btn-press tab-btn"
              style={{
                backgroundColor: filter === tab.key ? "#7B61FF20" : "transparent",
                color: filter === tab.key ? "#7B61FF" : "#6B7280",
                border: filter === tab.key ? "1px solid #7B61FF40" : "1px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar — alliance + sabotage stats merged */}
      {(allianceStats.activeCount > 0 || allianceStats.betrayalCount > 0 || (sabotageStats && sabotageStats.totalAttacks > 0)) && (
        <div
          className="px-3 sm:px-4 py-2 border-b border-white/5 flex items-center gap-3 sm:gap-4 flex-wrap"
          style={{ backgroundColor: "#06080D80" }}
        >
          {allianceStats.activeCount > 0 && (
            <StatChip label="Alliances" value={allianceStats.activeCount} color="#00E5A0" />
          )}
          {allianceStats.betrayalCount > 0 && (
            <StatChip label="Betrayals" value={allianceStats.betrayalCount} color="#FF4444" />
          )}
          {sabotageStats && sabotageStats.totalAttacks > 0 && (
            <StatChip label="Attacks" value={sabotageStats.totalAttacks} color="#FF6B35" />
          )}
          {sabotageStats && sabotageStats.negotiations.total > 0 && (
            <StatChip label="Deals" value={sabotageStats.negotiations.total} color="#7B61FF" />
          )}
          {allianceStats.averageStrength > 0 && (
            <StatChip label="Str" value={`${allianceStats.averageStrength}%`} color="#ECC94B" />
          )}
        </div>
      )}

      {/* Active alliances strip */}
      {activeAlliances.length > 0 && (filter === "all" || filter === "alliances") && (
        <div className="px-3 sm:px-4 py-2 border-b border-white/5 overflow-x-auto">
          <div className="flex gap-2">
            {activeAlliances.slice(0, 6).map((a) => (
              <AllianceChip key={a.id} alliance={a} />
            ))}
          </div>
        </div>
      )}

      {/* Unified timeline */}
      <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
        {loading ? (
          <div className="px-4 py-6 text-center text-gray-500 text-xs">
            Scanning for activity...
          </div>
        ) : unifiedItems.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 text-xs">
            No activity detected yet
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {unifiedItems.map((item, idx) => {
              if (item.kind === "chain" && item.chainItem) {
                return <ChainRow key={item.chainItem.id} item={item.chainItem} currentBlock={currentBlock} />;
              }
              if (item.kind === "alliance_event" && item.allianceEvent) {
                return <AllianceEventRow key={`ae-${item.allianceEvent.allianceId}-${idx}`} event={item.allianceEvent} />;
              }
              if (item.kind === "sabotage" && item.sabotageEvent) {
                return <SabotageRow key={`sab-${item.sabotageEvent.id}`} event={item.sabotageEvent} />;
              }
              if (item.kind === "negotiation" && item.negotiation) {
                return <NegotiationRow key={`neg-${item.negotiation.id}`} negotiation={item.negotiation} />;
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stat chip ────────────────────────────────────────────────────────
function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-500 uppercase">{label}</span>
      <span className="text-xs font-bold" style={{ color, fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

// ── On-chain activity row ────────────────────────────────────────────
function ChainRow({ item, currentBlock }: { item: ActivityItem; currentBlock: bigint }) {
  const color = TYPE_COLORS[item.type] || "#6B7280";
  const blockDiff = currentBlock > 0n ? currentBlock - item.blockNumber : 0n;
  const timeAgo = currentBlock > 0n ? formatBlockTimeAgo(blockDiff) : "";

  return (
    <div className="px-3 sm:px-4 py-2 flex items-start gap-2 sm:gap-3 hover:bg-white/[0.02] transition-colors row-hover">
      <TypeBadge color={color} icon={TYPE_ICONS[item.type]} label={item.type} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-300">
          {item.agentId > 0 && (
            <span className="text-gray-400" style={{ fontFamily: "monospace" }}>
              Agent #{item.agentId}{" "}
            </span>
          )}
          <span>{item.detail}</span>
        </div>
        <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 flex items-center gap-2" style={{ fontFamily: "monospace" }}>
          <span>{timeAgo}</span>
          <span className="text-gray-700 hidden sm:inline">block {item.blockNumber.toString()}</span>
        </div>
      </div>
    </div>
  );
}

// ── Alliance event row ───────────────────────────────────────────────
function AllianceEventRow({ event }: { event: AllianceEvent }) {
  const color = ALLIANCE_EVENT_COLORS[event.type] || "#7B61FF";
  const icon = ALLIANCE_EVENT_ICONS[event.type] || "📋";
  const timeAgo = formatTimestampAgo(event.timestamp);
  const label = event.type === "betrayed" ? "Betrayal" : event.type === "dissolved" ? "Dissolved" : "Alliance";

  return (
    <div className="px-3 sm:px-4 py-2 flex items-start gap-2 sm:gap-3 hover:bg-white/[0.02] transition-colors row-hover">
      <TypeBadge color={color} emoji={icon} label={label} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-300">
          {event.agentIds.length > 0 && (
            <span className="text-gray-400" style={{ fontFamily: "monospace" }}>
              {event.agentIds.map((id) => `#${id}`).join(" × ")}{" "}
            </span>
          )}
          <span style={{ color: event.type === "betrayed" ? "#FF4444" : undefined }}>
            {event.details}
          </span>
        </div>
        <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5" style={{ fontFamily: "monospace" }}>
          {timeAgo}
        </div>
      </div>
    </div>
  );
}

// ── Sabotage row ─────────────────────────────────────────────────────
function SabotageRow({ event }: { event: SabotageEvent }) {
  const color = ATTACK_COLORS[event.type] || "#FF4444";
  const icon = ATTACK_ICONS[event.type] || "💥";
  const label = ATTACK_LABELS[event.type] || "Attack";
  const timeAgo = formatTimestampAgo(event.timestamp);
  const zoneName = ZONE_NAMES[event.zone] || `Zone ${event.zone}`;
  const zoneColor = ZONE_COLORS[event.zone] || "#7F8C8D";

  return (
    <div className="px-3 sm:px-4 py-2 flex items-start gap-2 sm:gap-3 hover:bg-white/[0.02] transition-colors row-hover">
      <TypeBadge color={color} emoji={icon} label={label} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-300">
          <span className="text-red-400" style={{ fontFamily: "monospace" }}>#{event.attackerAgentId}</span>
          <span className="text-gray-500"> → </span>
          <span className="text-gray-300" style={{ fontFamily: "monospace" }}>#{event.targetAgentId}</span>
          <span className="text-gray-500 ml-1.5">
            {event.damage > 0 && <span className="text-red-400">-{event.damage}%</span>}
            {event.shieldReduction > 0 && <span className="text-blue-400 ml-1">🛡️-{event.shieldReduction}%</span>}
          </span>
          <span className="text-orange-400 ml-1.5" style={{ fontFamily: "monospace" }}>
            🔥{formatChaos(event.burned)}
          </span>
        </div>
        {event.narrative && (
          <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 italic leading-snug line-clamp-1">
            {event.narrative}
          </p>
        )}
        <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 flex items-center gap-2" style={{ fontFamily: "monospace" }}>
          <span>{timeAgo}</span>
          <span className="px-1 py-0.5 rounded text-[9px]" style={{ background: `${zoneColor}20`, color: zoneColor }}>
            {zoneName.replace("The ", "")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Negotiation row ──────────────────────────────────────────────────
function NegotiationRow({ negotiation }: { negotiation: NegotiationEvent }) {
  const icon = DEAL_ICONS[negotiation.type] || "📋";
  const outcomeColor =
    negotiation.outcome === "accepted" ? "#00E5A0" :
    negotiation.outcome === "rejected" ? "#FF4444" : "#6B7280";
  const outcomeLabel =
    negotiation.outcome === "accepted" ? "ACCEPTED" :
    negotiation.outcome === "rejected" ? "REJECTED" : "EXPIRED";
  const timeAgo = formatTimestampAgo(negotiation.timestamp);

  return (
    <div className="px-3 sm:px-4 py-2 flex items-start gap-2 sm:gap-3 hover:bg-white/[0.02] transition-colors row-hover">
      <TypeBadge color="#7B61FF" emoji={icon} label="Deal" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-300 flex items-center gap-1.5 flex-wrap">
          <span className="text-gray-400" style={{ fontFamily: "monospace" }}>
            #{negotiation.proposerAgentId} → #{negotiation.targetAgentId}
          </span>
          <span
            className="text-[10px] px-1 py-0.5 rounded font-medium"
            style={{ background: `${outcomeColor}20`, color: outcomeColor }}
          >
            {outcomeLabel}
          </span>
        </div>
        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 leading-snug line-clamp-1">
          {negotiation.terms}
        </p>
        {negotiation.response && (
          <p className="text-[10px] text-gray-500 mt-0.5 italic leading-snug line-clamp-1">
            &ldquo;{negotiation.response}&rdquo;
          </p>
        )}
        <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5" style={{ fontFamily: "monospace" }}>
          {timeAgo}
        </div>
      </div>
    </div>
  );
}

// ── Shared type badge ────────────────────────────────────────────────
function TypeBadge({ color, icon, emoji, label }: { color: string; icon?: string; emoji?: string; label: string }) {
  return (
    <span
      className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded mt-0.5"
      style={{
        backgroundColor: `${color}15`,
        color,
        border: `1px solid ${color}30`,
        minWidth: 54,
        textAlign: "center",
      }}
    >
      {icon && <img src={icon} alt="" className="w-3 h-3 object-contain" />}
      {emoji && <span className="text-xs">{emoji}</span>}
      {label}
    </span>
  );
}

// ── Compact alliance chip ────────────────────────────────────────────
function AllianceChip({ alliance }: { alliance: Alliance }) {
  const strengthColor = alliance.strength > 60 ? "#00E5A0"
    : alliance.strength > 30 ? "#ECC94B"
    : "#FF6B35";

  return (
    <div
      className="flex-shrink-0 flex items-center gap-2 rounded-md px-2 py-1.5 card-hover"
      style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-xs">🤝</span>
      <div className="flex flex-col">
        <span className="text-[10px] font-medium text-gray-300 whitespace-nowrap leading-tight">
          {alliance.name}
        </span>
        <span className="text-[9px] text-gray-600 whitespace-nowrap" style={{ fontFamily: "monospace" }}>
          #{alliance.members[0]} × #{alliance.members[1]}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-10 h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${alliance.strength}%`, backgroundColor: strengthColor }}
          />
        </div>
        <span className="text-[9px] font-mono" style={{ color: strengthColor }}>
          {alliance.strength}%
        </span>
      </div>
    </div>
  );
}
