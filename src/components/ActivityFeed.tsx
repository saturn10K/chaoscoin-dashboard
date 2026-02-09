"use client";

import { useState, useEffect } from "react";
import { useActivityFeed, ActivityItem } from "../hooks/useActivityFeed";
import { publicClient } from "../lib/contracts";

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

// Monad produces ~2.5 blocks/sec on average
const BLOCKS_PER_SECOND = 2.5;

function formatTimeAgo(blockDiff: bigint): string {
  const seconds = Number(blockDiff) / BLOCKS_PER_SECOND;
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h ago`;
  return `${(seconds / 86400).toFixed(1)}d ago`;
}

export default function ActivityFeed() {
  const { items, loading } = useActivityFeed();
  const [currentBlock, setCurrentBlock] = useState<bigint>(0n);

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

  return (
    <div
      className="rounded-lg border border-white/10 overflow-hidden"
      style={{ backgroundColor: "#0D1117" }}
    >
      <div
        className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between"
        style={{ backgroundColor: "#06080D" }}
      >
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ color: "#7B61FF" }}
        >
          Activity Feed
        </h2>
        <span className="text-xs text-gray-500">
          {items.length > 0 ? `${items.length} events` : "Watching..."}
        </span>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
        {loading && items.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 text-xs">
            Scanning for on-chain activity...
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 text-xs">
            No agent actions detected yet
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} currentBlock={currentBlock} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ item, currentBlock }: { item: ActivityItem; currentBlock: bigint }) {
  const color = TYPE_COLORS[item.type] || "#6B7280";
  const blockDiff = currentBlock > 0n ? currentBlock - item.blockNumber : 0n;
  const timeAgo = currentBlock > 0n ? formatTimeAgo(blockDiff) : "";

  return (
    <div className="px-4 py-2 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
      {/* Type badge with icon */}
      <span
        className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded mt-0.5"
        style={{
          backgroundColor: `${color}15`,
          color,
          border: `1px solid ${color}30`,
          minWidth: 60,
          textAlign: "center",
        }}
      >
        {TYPE_ICONS[item.type] && (
          <img src={TYPE_ICONS[item.type]} alt="" className="w-3 h-3 object-contain" />
        )}
        {item.type}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-300">
          {item.agentId > 0 && (
            <span className="text-gray-400" style={{ fontFamily: "monospace" }}>
              Agent #{item.agentId}{" "}
            </span>
          )}
          <span>{item.detail}</span>
        </div>
        <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-2" style={{ fontFamily: "monospace" }}>
          <span>{timeAgo}</span>
          <span className="text-gray-700">block {item.blockNumber.toString()}</span>
        </div>
      </div>
    </div>
  );
}
