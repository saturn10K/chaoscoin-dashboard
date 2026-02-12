"use client";

import { useAlliances, Alliance, AllianceEvent } from "../hooks/useSocialFeed";
import { ReactNode } from "react";
import { HandHeartIcon, LikeIcon, ChartLineIcon, SkullEmojiIcon, HeartIcon, TargetIcon, FileDescriptionIcon } from "./icons";

const EVENT_COLORS: Record<string, string> = {
  formed: "#00E5A0",
  strengthened: "#48BB78",
  weakened: "#ECC94B",
  betrayed: "#FF4444",
  dissolved: "#6C757D",
};

const EVENT_ICONS: Record<string, ReactNode> = {
  formed: <HandHeartIcon size={14} />,
  strengthened: <LikeIcon size={14} />,
  weakened: <ChartLineIcon size={14} />,
  betrayed: <SkullEmojiIcon size={14} />,
  dissolved: <HeartIcon size={14} />,
};

export default function AlliancePanel() {
  const { alliances, events, stats } = useAlliances();

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <h2
        className="text-sm font-semibold mb-3 uppercase tracking-wider"
        style={{ color: "#7B61FF" }}
      >
        <>Alliances & Betrayals <TargetIcon size={14} className="inline" /></>
      </h2>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatBox label="Active" value={stats.activeCount} color="#00E5A0" />
        <StatBox label="Betrayals" value={stats.betrayalCount} color="#FF4444" />
        <StatBox label="Avg Strength" value={`${stats.averageStrength}%`} color="#ECC94B" />
      </div>

      {/* Active alliances */}
      {alliances.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Active Alliances
          </div>
          <div className="space-y-1.5">
            {alliances.slice(0, 8).map(alliance => (
              <AllianceRow key={alliance.id} alliance={alliance} />
            ))}
          </div>
        </div>
      )}

      {/* Recent events */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Recent Events
        </div>
        {events.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-3">
            No alliance activity yet...
          </div>
        ) : (
          <div className="space-y-1 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {events.slice(0, 15).map((evt, i) => (
              <EventRow key={`${evt.allianceId}-${i}`} event={evt} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AllianceRow({ alliance }: { alliance: Alliance }) {
  const strengthColor = alliance.strength > 60 ? "#00E5A0"
    : alliance.strength > 30 ? "#ECC94B"
    : "#FF6B35";

  return (
    <div
      className="flex items-center justify-between rounded p-2"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-center gap-2">
        <HandHeartIcon size={16} />
        <div>
          <div className="text-xs font-medium text-gray-300">{alliance.name}</div>
          <div className="text-xs text-gray-600">
            Agent #{alliance.members[0]} × #{alliance.members[1]}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${alliance.strength}%`,
              backgroundColor: strengthColor,
            }}
          />
        </div>
        <span
          className="text-xs font-mono"
          style={{ color: strengthColor }}
        >
          {alliance.strength}%
        </span>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: AllianceEvent }) {
  const color = EVENT_COLORS[event.type] || "#7B61FF";
  const icon = EVENT_ICONS[event.type] || <FileDescriptionIcon size={14} />;
  const timeAgo = formatTimeAgo(event.timestamp);

  return (
    <div className="flex items-start gap-2 text-xs py-1">
      <span>{icon}</span>
      <span className="text-gray-400 flex-1" style={{ color }}>
        {event.details}
      </span>
      <span className="text-gray-600 whitespace-nowrap">{timeAgo}</span>
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

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
