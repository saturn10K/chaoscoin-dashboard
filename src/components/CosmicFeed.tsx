"use client";

import { EVENT_TYPES, EVENT_ICONS, TIER_COLORS, ZONE_NAMES } from "../lib/constants";

interface CosmicEvent {
  eventId: number;
  eventType: number;
  severityTier: number;
  originZone: number;
  affectedZonesMask: number;
  triggerBlock: string;
  processed: boolean;
}

interface CosmicFeedProps {
  events: CosmicEvent[];
}

function getTierLabel(tier: number): string {
  if (tier === 1) return "T1";
  if (tier === 2) return "T2";
  if (tier === 3) return "T3";
  return "T?";
}

function getAffectedZones(mask: number): number[] {
  const zones: number[] = [];
  for (let i = 0; i < 8; i++) {
    if (mask & (1 << i)) {
      zones.push(i);
    }
  }
  return zones;
}

export default function CosmicFeed({ events }: CosmicFeedProps) {
  return (
    <div
      className="rounded-lg border border-white/10 overflow-hidden"
      style={{ backgroundColor: "#0D1117" }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2"
        style={{ backgroundColor: "#06080D" }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: "#7B61FF" }}
        />
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ color: "#7B61FF" }}
        >
          Cosmic Events
        </h2>
        <span className="ml-auto text-xs text-gray-500" style={{ fontFamily: "monospace" }}>
          {events.length} events
        </span>
      </div>

      {/* Scrollable Feed */}
      <div className="overflow-y-auto max-h-96 divide-y divide-white/5">
        {events.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No cosmic events recorded yet
          </div>
        )}

        {events.map((event) => {
          const tierColor =
            TIER_COLORS[event.severityTier as keyof typeof TIER_COLORS] || "#7F8C8D";
          const eventInfo = EVENT_TYPES[event.eventType] || {
            name: `Unknown Event #${event.eventType}`,
            tier: event.severityTier,
            color: tierColor,
          };
          const affectedZones = getAffectedZones(event.affectedZonesMask);

          return (
            <div
              key={event.eventId}
              className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
            >
              {/* Event Icon + Tier Badge */}
              <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
                <img
                  src={EVENT_ICONS[event.eventType] || EVENT_ICONS[0]}
                  alt=""
                  className="w-7 h-7 object-contain"
                  style={{ filter: `drop-shadow(0 0 4px ${tierColor}60)` }}
                />
                <span
                  className="text-xs font-bold"
                  style={{ color: tierColor, fontFamily: "monospace", fontSize: 9 }}
                >
                  {getTierLabel(event.severityTier)}
                </span>
              </div>

              {/* Event Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200 truncate">
                    {eventInfo.name}
                  </span>
                  {event.processed ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-500/20">
                      Resolved
                    </span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-500/20 animate-pulse">
                      Active
                    </span>
                  )}
                </div>

                {/* Affected Zones Row */}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-500">Origin:</span>
                  <span className="text-xs text-gray-400">
                    {ZONE_NAMES[event.originZone] || `Zone ${event.originZone}`}
                  </span>
                  <span className="text-xs text-gray-600 mx-1">|</span>
                  <span className="text-xs text-gray-500">Affected:</span>
                  <div className="flex gap-0.5">
                    {affectedZones.map((z) => (
                      <span
                        key={z}
                        className="w-3 h-3 rounded-sm flex items-center justify-center"
                        title={ZONE_NAMES[z] || `Zone ${z}`}
                        style={{
                          backgroundColor: `${tierColor}30`,
                          border: `1px solid ${tierColor}50`,
                        }}
                      >
                        <span
                          className="block w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: tierColor }}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Block Number */}
              <div className="flex-shrink-0 text-right">
                <span
                  className="text-xs text-gray-500"
                  style={{ fontFamily: "monospace" }}
                >
                  Block #{event.triggerBlock}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
