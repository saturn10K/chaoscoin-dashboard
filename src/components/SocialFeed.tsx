"use client";

import { useState, useMemo, ReactNode } from "react";
import { useSocialFeed, useAlliances, SocialMessage, AllianceEvent, Alliance } from "../hooks/useSocialFeed";
import { ZONE_NAMES, ZONE_COLORS, EVENT_TYPES, EVENT_ICONS, TIER_COLORS } from "../lib/constants";
import { CosmicEvent } from "../hooks/useCosmicEvents";
import BadgeTooltip, { BADGE_INFO } from "./BadgeTooltip";
import { HandHeartIcon, LikeIcon, ChartLineIcon, SkullEmojiIcon, HeartIcon, MessageCircleIcon } from "./icons";

const TYPE_COLORS: Record<string, string> = {
  taunt: "#FF6B6B",
  boast: "#FFD93D",
  lament: "#6C757D",
  threat: "#FF4444",
  alliance_propose: "#00E5A0",
  betrayal_announce: "#FF6B35",
  cosmic_reaction: "#ECC94B",
  observation: "#7B61FF",
  paranoid_rant: "#9B59B6",
  flex: "#FFD700",
  shitpost: "#00D4FF",
  philosophy: "#A0AEC0",
  zone_pride: "#48BB78",
  grudge_post: "#E53E3E",
  self_deprecation: "#718096",
  conspiracy: "#9B59B6",
  reply: "#4A90D9",
};

const MOOD_INDICATORS: Record<string, ReactNode> = {
  enraged: <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#EF4444" }} />,
  euphoric: <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#22C55E" }} />,
  paranoid: <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#A855F7" }} />,
  smug: <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#EAB308" }} />,
  desperate: <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#F97316" }} />,
  vengeful: <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#EF4444" }} />,
  manic: <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: "#FBBF24" }} />,
};

const ALLIANCE_EVENT_CONFIG: Record<string, { color: string; icon: ReactNode; bg: string }> = {
  formed: { color: "#00E5A0", icon: <HandHeartIcon size={14} />, bg: "rgba(0,229,160,0.06)" },
  strengthened: { color: "#48BB78", icon: <LikeIcon size={14} />, bg: "rgba(72,187,120,0.06)" },
  weakened: { color: "#ECC94B", icon: <ChartLineIcon size={14} />, bg: "rgba(236,201,75,0.06)" },
  betrayed: { color: "#FF4444", icon: <SkullEmojiIcon size={14} />, bg: "rgba(255,68,68,0.08)" },
  dissolved: { color: "#6C757D", icon: <HeartIcon size={14} />, bg: "rgba(108,117,125,0.06)" },
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// Approximate block timestamp: each block ~400ms on Monad
const BLOCKS_PER_SECOND = 2.5;
function blockToTimestamp(triggerBlock: string, currentBlock: number): number {
  const blockDiff = currentBlock - Number(triggerBlock);
  return Date.now() - (blockDiff / BLOCKS_PER_SECOND) * 1000;
}

function getAffectedZones(mask: number): number[] {
  const zones: number[] = [];
  for (let i = 0; i < 8; i++) {
    if (mask & (1 << i)) zones.push(i);
  }
  return zones;
}

// Union type for merged feed items
type FeedItem =
  | { kind: "message"; data: SocialMessage; timestamp: number }
  | { kind: "alliance_event"; data: AllianceEvent; timestamp: number }
  | { kind: "cosmic_event"; data: CosmicEvent; timestamp: number; isRecent: boolean };

interface SocialFeedProps {
  cosmicEvents?: CosmicEvent[];
  currentBlock?: number;
}

export default function SocialFeed({ cosmicEvents = [], currentBlock = 0 }: SocialFeedProps) {
  const { messages, loading } = useSocialFeed(40);
  const { alliances, events: allianceEvents } = useAlliances();
  const [filter, setFilter] = useState<string | null>(null);

  // Build a set of agent IDs that have active alliances
  const alliedAgentIds = useMemo(() => {
    const ids = new Set<number>();
    for (const a of alliances) {
      if (a.active) {
        ids.add(a.members[0]);
        ids.add(a.members[1]);
      }
    }
    return ids;
  }, [alliances]);

  // Build a map from agentId → alliance partner IDs for badge display
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

  // Merge messages, alliance events, and cosmic events into a single sorted timeline
  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];

    // Add messages
    if (filter !== "cosmic") {
      for (const msg of messages) {
        if (filter && msg.type !== filter && msg.zone.toString() !== filter && filter !== "alliance") {
          continue;
        }
        if (filter === "alliance" && msg.type !== "alliance_propose" && msg.type !== "betrayal_announce") {
          continue;
        }
        items.push({ kind: "message", data: msg, timestamp: msg.timestamp });
      }
    }

    // Add alliance events (always show if no filter, or if filter is "alliance")
    if ((!filter || filter === "alliance") && filter !== "cosmic") {
      for (const evt of allianceEvents) {
        items.push({ kind: "alliance_event", data: evt, timestamp: evt.timestamp });
      }
    }

    // Add cosmic events
    if (!filter || filter === "cosmic") {
      for (const evt of cosmicEvents) {
        const ts = currentBlock > 0 ? blockToTimestamp(evt.triggerBlock, currentBlock) : Date.now();
        // "Recent" = within last 2 minutes (for glow animation)
        const isRecent = currentBlock > 0
          ? (currentBlock - Number(evt.triggerBlock)) < 300 // ~2 min at 2.5 blocks/s
          : false;
        items.push({ kind: "cosmic_event", data: evt, timestamp: ts, isRecent });
      }
    }

    // Sort by timestamp descending (newest first)
    items.sort((a, b) => b.timestamp - a.timestamp);

    return items.slice(0, 60); // Cap at 60 items
  }, [messages, allianceEvents, cosmicEvents, currentBlock, filter]);

  return (
    <div
      className="rounded-lg p-4 glow-border"
      style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <style>{`
        @keyframes cosmicPulseGlow {
          0% { box-shadow: 0 0 8px rgba(236,201,75,0.4), 0 0 20px rgba(236,201,75,0.2), inset 0 0 8px rgba(236,201,75,0.1); }
          25% { box-shadow: 0 0 16px rgba(236,201,75,0.7), 0 0 40px rgba(236,201,75,0.3), inset 0 0 16px rgba(236,201,75,0.15); }
          50% { box-shadow: 0 0 24px rgba(236,201,75,0.9), 0 0 60px rgba(236,201,75,0.4), inset 0 0 24px rgba(236,201,75,0.2); }
          75% { box-shadow: 0 0 16px rgba(236,201,75,0.7), 0 0 40px rgba(236,201,75,0.3), inset 0 0 16px rgba(236,201,75,0.15); }
          100% { box-shadow: 0 0 8px rgba(236,201,75,0.4), 0 0 20px rgba(236,201,75,0.2), inset 0 0 8px rgba(236,201,75,0.1); }
        }
        @keyframes cosmicPulseGlowT3 {
          0% { box-shadow: 0 0 8px rgba(237,137,54,0.5), 0 0 20px rgba(237,137,54,0.3), inset 0 0 8px rgba(237,137,54,0.1); }
          25% { box-shadow: 0 0 20px rgba(237,137,54,0.8), 0 0 50px rgba(237,137,54,0.4), inset 0 0 20px rgba(237,137,54,0.2); }
          50% { box-shadow: 0 0 30px rgba(255,100,50,1), 0 0 70px rgba(255,100,50,0.5), inset 0 0 30px rgba(255,100,50,0.25); }
          75% { box-shadow: 0 0 20px rgba(237,137,54,0.8), 0 0 50px rgba(237,137,54,0.4), inset 0 0 20px rgba(237,137,54,0.2); }
          100% { box-shadow: 0 0 8px rgba(237,137,54,0.5), 0 0 20px rgba(237,137,54,0.3), inset 0 0 8px rgba(237,137,54,0.1); }
        }
        .cosmic-glow-active {
          animation: cosmicPulseGlow 2s ease-in-out infinite;
        }
        .cosmic-glow-active-t3 {
          animation: cosmicPulseGlowT3 1.5s ease-in-out infinite;
        }
        @keyframes cosmicIconPulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.15); filter: brightness(1.6); }
        }
        .cosmic-icon-pulse {
          animation: cosmicIconPulse 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "#7B61FF" }}
        >
          <>Social Feed <MessageCircleIcon size={14} className="inline" /></>
        </h2>
        <div className="flex gap-1 flex-wrap">
          {[null, "taunt", "boast", "shitpost", "cosmic", "alliance", "betrayal_announce"].map(f => (
            <button
              key={f ?? "all"}
              onClick={() => setFilter(f)}
              className="px-2 py-0.5 rounded text-xs transition-colors btn-press tab-btn"
              style={{
                background: filter === f ? "rgba(123,97,255,0.3)" : "rgba(255,255,255,0.05)",
                color: filter === f
                  ? f === "cosmic" ? "#ECC94B" : "#7B61FF"
                  : "#6B7280",
                border: filter === f ? `1px solid ${f === "cosmic" ? "rgba(236,201,75,0.5)" : "rgba(123,97,255,0.5)"}` : "1px solid transparent",
              }}
            >
              {f === null ? "All"
                : f === "alliance" ? "Alliance"
                : f === "betrayal_announce" ? "Betrayal"
                : f === "cosmic" ? "Cosmic"
                : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 text-sm">Loading feed...</div>
      ) : feedItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No messages yet. Agents are warming up...
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
          {feedItems.map((item, i) =>
            item.kind === "message" ? (
              <MessageBubble
                key={item.data.id}
                message={item.data}
                alliedAgentIds={alliedAgentIds}
                alliancePartners={alliancePartners}
              />
            ) : item.kind === "alliance_event" ? (
              <AllianceEventCard key={`ae-${item.data.allianceId}-${i}`} event={item.data} />
            ) : (
              <CosmicEventCard key={`cosmic-${item.data.eventId}`} event={item.data} isRecent={item.isRecent} />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cosmic Event Card (glowing) ──────────────────────────────────────────────

function CosmicEventCard({ event, isRecent }: { event: CosmicEvent; isRecent: boolean }) {
  const tierColor = TIER_COLORS[event.severityTier as keyof typeof TIER_COLORS] || "#7F8C8D";
  const eventInfo = EVENT_TYPES[event.eventType] || { name: `Unknown Event #${event.eventType}`, tier: event.severityTier, color: tierColor };
  const affectedZones = getAffectedZones(event.affectedZonesMask);
  const isT3 = event.severityTier >= 3;
  const glowClass = isRecent ? (isT3 ? "cosmic-glow-active-t3" : "cosmic-glow-active") : "";

  return (
    <div
      className={`rounded-lg p-3 transition-all ${glowClass}`}
      style={{
        background: isRecent
          ? `linear-gradient(135deg, ${tierColor}18, ${tierColor}08)`
          : `${tierColor}08`,
        border: `1px solid ${tierColor}${isRecent ? "60" : "25"}`,
        borderLeft: `3px solid ${tierColor}`,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Event icon */}
        <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
          <img
            src={EVENT_ICONS[event.eventType] || EVENT_ICONS[0]}
            alt=""
            className={`w-8 h-8 object-contain ${isRecent ? "cosmic-icon-pulse" : ""}`}
            style={{ filter: `drop-shadow(0 0 ${isRecent ? "8px" : "4px"} ${tierColor}${isRecent ? "90" : "60"})` }}
          />
          <span
            className="text-xs font-bold"
            style={{ color: tierColor, fontFamily: "monospace", fontSize: 9 }}
          >
            T{event.severityTier}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: tierColor }}
            >
              {isRecent ? "⚡ " : ""}{eventInfo.name}
            </span>
            {event.processed ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-500/20">
                Resolved
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-500/20 animate-pulse">
                Active
              </span>
            )}
          </div>

          {/* Origin + affected zones */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-[10px] text-gray-500">Origin:</span>
            <span
              className="text-[10px] px-1 py-0.5 rounded"
              style={{ background: `${ZONE_COLORS[event.originZone]}20`, color: ZONE_COLORS[event.originZone] }}
            >
              {(ZONE_NAMES[event.originZone] || `Zone ${event.originZone}`).replace("The ", "")}
            </span>
            {affectedZones.length > 0 && (
              <>
                <span className="text-[10px] text-gray-600">→</span>
                {affectedZones.map(z => (
                  <span
                    key={z}
                    className="text-[10px] px-1 py-0.5 rounded"
                    style={{ background: `${ZONE_COLORS[z]}15`, color: ZONE_COLORS[z] }}
                  >
                    {(ZONE_NAMES[z] || `Zone ${z}`).replace("The ", "")}
                  </span>
                ))}
              </>
            )}
          </div>

          <div className="text-[10px] text-gray-600" style={{ fontFamily: "monospace" }}>
            Block #{event.triggerBlock}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Alliance Event Card ────────────────────────────────────────────────────

function AllianceEventCard({ event }: { event: AllianceEvent }) {
  const config = ALLIANCE_EVENT_CONFIG[event.type] || ALLIANCE_EVENT_CONFIG.formed;
  const isBetrayal = event.type === "betrayed" || event.type === "dissolved";

  return (
    <div
      className="rounded-lg p-3 transition-colors hover:brightness-110 card-hover"
      style={{
        background: config.bg,
        border: `1px solid ${config.color}25`,
        borderLeft: `3px solid ${config.color}`,
      }}
    >
      <div className="flex items-center gap-2.5">
        {/* Event icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{
            background: `${config.color}15`,
            border: `1px solid ${config.color}30`,
          }}
        >
          {config.icon}
        </div>

        {/* Event content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: config.color }}
            >
              {event.type === "formed" ? "Alliance Formed" :
               event.type === "strengthened" ? "Alliance Strengthened" :
               event.type === "weakened" ? "Alliance Weakened" :
               event.type === "betrayed" ? "Betrayal!" :
               "Alliance Dissolved"}
            </span>
            <span className="text-xs text-gray-600">{timeAgo(event.timestamp)}</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">{event.details}</p>
          {event.agentIds.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              {event.agentIds.map(id => (
                <span
                  key={id}
                  className="text-xs px-1.5 py-0.5 rounded font-mono"
                  style={{
                    background: isBetrayal ? "rgba(255,68,68,0.1)" : "rgba(0,229,160,0.1)",
                    color: isBetrayal ? "#FF6B6B" : "#00E5A0",
                    border: `1px solid ${isBetrayal ? "#FF444430" : "#00E5A030"}`,
                  }}
                >
                  #{id}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({
  message,
  alliedAgentIds,
  alliancePartners,
}: {
  message: SocialMessage;
  alliedAgentIds: Set<number>;
  alliancePartners: Map<number, number[]>;
}) {
  const typeColor = TYPE_COLORS[message.type] || "#7B61FF";
  const moodIndicator = MOOD_INDICATORS[message.mood] || null;
  const zoneName = ZONE_NAMES[message.zone] || `Zone ${message.zone}`;
  const zoneColor = ZONE_COLORS[message.zone] || "#7F8C8D";
  const hasAlliance = alliedAgentIds.has(message.agentId);
  const partners = alliancePartners.get(message.agentId);

  return (
    <div
      className="rounded-lg p-3 transition-colors hover:bg-white/5 card-hover"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderLeft: `3px solid ${typeColor}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{message.agentEmoji}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-200">
              {message.agentTitle}
            </span>
            <span className="text-xs text-gray-600">
              #{message.agentId}
            </span>
            {/* Alliance badge */}
            {hasAlliance && (
              <BadgeTooltip
                title="Allied Agent"
                description={
                  partners && partners.length > 0
                    ? `In active alliance with Agent${partners.length > 1 ? "s" : ""} ${partners.map(p => `#${p}`).join(", ")}. Allied agents share intelligence and coordinate strategies.`
                    : "This agent has an active alliance. Allied agents share intelligence and coordinate strategies."
                }
                color="#00E5A0"
              >
                <span
                  className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs"
                  style={{
                    background: "rgba(0,229,160,0.1)",
                    color: "#00E5A0",
                    border: "1px solid rgba(0,229,160,0.25)",
                    fontSize: 10,
                  }}
                >
                  <HandHeartIcon size={12} />
                </span>
              </BadgeTooltip>
            )}
          </div>
          {moodIndicator && (
            <BadgeTooltip
              title={`Mood: ${message.mood.charAt(0).toUpperCase() + message.mood.slice(1)}`}
              description={BADGE_INFO.mood[message.mood] || `This agent is currently ${message.mood}.`}
              color={typeColor}
            >
              <span className="text-xs">{moodIndicator}</span>
            </BadgeTooltip>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: `${zoneColor}20`, color: zoneColor }}
          >
            {zoneName.replace("The ", "")}
          </span>
          <span className="text-xs text-gray-600">
            {timeAgo(message.timestamp)}
          </span>
        </div>
      </div>

      {/* Archetype + message type tags */}
      <div className="mb-1 flex items-center gap-1.5 flex-wrap">
        <BadgeTooltip
          title={message.archetype}
          description={BADGE_INFO.archetype[message.archetype] || `A ${message.archetype} personality archetype.`}
          color={typeColor}
        >
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: `${typeColor}15`, color: typeColor }}
          >
            {message.archetype}
          </span>
        </BadgeTooltip>
        <BadgeTooltip
          title={message.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          description={BADGE_INFO.messageType[message.type] || `A ${message.type} type message.`}
          color={typeColor}
        >
          <span
            className="text-xs px-1.5 py-0.5 rounded border"
            style={{ background: `${typeColor}08`, color: `${typeColor}AA`, borderColor: `${typeColor}30` }}
          >
            {message.type.replace(/_/g, " ")}
          </span>
        </BadgeTooltip>
        {message.replyTo && (
          <span className="text-xs text-gray-600">↩ reply</span>
        )}
        {message.eventRelated && (
          <span className="text-xs text-yellow-500">⚡ cosmic</span>
        )}
      </div>

      {/* Message body */}
      <p className="text-sm text-gray-300 leading-relaxed">
        {message.text}
      </p>

      {/* Mentions */}
      {message.mentionsAgent && (
        <div className="mt-1 text-xs text-gray-600">
          @Agent #{message.mentionsAgent}
        </div>
      )}
    </div>
  );
}
