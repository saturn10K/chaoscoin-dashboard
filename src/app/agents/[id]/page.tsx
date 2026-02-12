"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCountUp, formatAnimatedNumber } from "../../../hooks/useCountUp";
import { useAgentDetails, RigInfo } from "../../../hooks/useAgentDetails";
import { useActivityFeed } from "../../../hooks/useActivityFeed";
import { useSocialFeed, useAlliances } from "../../../hooks/useSocialFeed";
import { useSabotage } from "../../../hooks/useSabotage";
import { useChainData } from "../../../hooks/useChainData";
import HeaderBar from "../../../components/HeaderBar";
import ErrorBoundary from "../../../components/ErrorBoundary";
import {
  ZONE_NAMES,
  ZONE_COLORS,
  ZONE_IMAGES,
  RIG_NAMES,
  RIG_IMAGES,
  FACILITY_NAMES,
  FACILITY_IMAGES,
  SHIELD_NAMES,
  SHIELD_IMAGES,
  RIG_TIER_COLORS,
  PIONEER_BADGES,
} from "../../../lib/constants";
import BadgeTooltip, { BADGE_INFO } from "../../../components/BadgeTooltip";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(val: string, decimals = 2): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ─── Shared UI primitives ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#7B61FF" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Metric({ label, value, color, mono }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <div className="rounded-md p-2.5 border border-white/5" style={{ backgroundColor: "#06080D" }}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div
        className="text-sm font-medium"
        style={{ color: color || "#E5E7EB", fontFamily: mono ? "monospace" : undefined }}
      >
        {value}
      </div>
    </div>
  );
}

/** Metric with counting animation for numeric values */
function AnimatedMetric({ label, rawValue, suffix, color, decimals = 2 }: {
  label: string;
  rawValue: string;
  suffix?: string;
  color?: string;
  decimals?: number;
}) {
  const animated = useCountUp(rawValue, 1500);
  return (
    <div className="rounded-md p-2.5 border border-white/5" style={{ backgroundColor: "#06080D" }}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div
        className="text-sm font-medium"
        style={{ color: color || "#E5E7EB", fontFamily: "monospace" }}
      >
        {formatAnimatedNumber(animated, decimals)}{suffix ? ` ${suffix}` : ""}
      </div>
    </div>
  );
}

// ─── Rig display ─────────────────────────────────────────────────────────────

interface RigGroup {
  tier: number;
  rigs: RigInfo[];
  avgDurability: number;
}

function groupRigsByTier(rigs: RigInfo[]): RigGroup[] {
  const map = new Map<number, RigInfo[]>();
  for (const rig of rigs) {
    const list = map.get(rig.tier) || [];
    list.push(rig);
    map.set(rig.tier, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([tier, tierRigs]) => ({
      tier,
      rigs: tierRigs,
      avgDurability:
        tierRigs.reduce((sum, r) => sum + (r.maxDurability > 0 ? (r.durability / r.maxDurability) * 100 : 0), 0) /
        tierRigs.length,
    }));
}

function RigSection({ rigs, slots }: { rigs: RigInfo[]; slots: number }) {
  const [tab, setTab] = useState<"equipped" | "inventory">("equipped");

  const equipped = useMemo(() => rigs.filter((r) => r.active), [rigs]);
  const inventory = useMemo(() => rigs.filter((r) => !r.active), [rigs]);
  const equippedGroups = useMemo(() => groupRigsByTier(equipped), [equipped]);
  const inventoryGroups = useMemo(() => groupRigsByTier(inventory), [inventory]);

  const groups = tab === "equipped" ? equippedGroups : inventoryGroups;
  const currentList = tab === "equipped" ? equipped : inventory;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7B61FF" }}>
          Rigs ({equipped.length}/{slots} equipped, {rigs.length} total)
        </h3>
      </div>

      <div className="flex gap-1 mb-3">
        {(["equipped", "inventory"] as const).map((t) => {
          const count = t === "equipped" ? equipped.length : inventory.length;
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={{
                background: isActive ? "rgba(123,97,255,0.2)" : "rgba(255,255,255,0.03)",
                color: isActive ? "#7B61FF" : "#6B7280",
                border: isActive ? "1px solid rgba(123,97,255,0.4)" : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {t === "equipped" ? "Equipped" : "Inventory"}
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                style={{
                  background: isActive ? "rgba(123,97,255,0.3)" : "rgba(255,255,255,0.05)",
                  fontSize: 10,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {currentList.length === 0 ? (
        <div className="text-xs text-gray-500 py-3 text-center">
          {tab === "equipped" ? "No rigs equipped" : "No rigs in inventory"}
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <RigGroupCard key={group.tier} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function RigGroupCard({ group }: { group: RigGroup }) {
  const { tier, rigs: tierRigs, avgDurability } = group;
  const tierColor = RIG_TIER_COLORS[tier] || "#6B7280";
  const totalHash = tierRigs.reduce((s, r) => s + Number(r.baseHashrate), 0);
  const totalPower = tierRigs.reduce((s, r) => s + r.powerDraw, 0);

  return (
    <div className="rounded-lg p-3 border border-white/5" style={{ backgroundColor: "#06080D" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img src={RIG_IMAGES[tier] || RIG_IMAGES[0]} alt="" className="w-8 h-8 object-contain" />
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${tierColor}20`, color: tierColor, border: `1px solid ${tierColor}40` }}
          >
            T{tier}
          </span>
          <span className="text-sm text-gray-200">{RIG_NAMES[tier] || `Tier ${tier} Rig`}</span>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}30` }}
        >
          {tierRigs.length > 1 ? `x${tierRigs.length}` : `#${tierRigs[0].rigId}`}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Hash: </span>
          <span className="text-gray-300" style={{ fontFamily: "monospace" }}>
            {tierRigs.length > 1 ? `${tierRigs[0].baseHashrate} ea` : tierRigs[0].baseHashrate}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Power: </span>
          <span className="text-gray-300" style={{ fontFamily: "monospace" }}>
            {tierRigs.length > 1 ? `${totalPower}W total` : `${tierRigs[0].powerDraw}W`}
          </span>
        </div>
        <div>
          <span className="text-gray-500">{tierRigs.length > 1 ? "Total Hash: " : "Rig ID: "}</span>
          <span className="text-gray-300" style={{ fontFamily: "monospace" }}>
            {tierRigs.length > 1 ? totalHash : `#${tierRigs[0].rigId}`}
          </span>
        </div>
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-gray-500">{tierRigs.length > 1 ? "Avg Durability" : "Durability"}</span>
          <span className="text-gray-400" style={{ fontFamily: "monospace" }}>{avgDurability.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${avgDurability}%`,
              backgroundColor: avgDurability > 50 ? "#00E5A0" : avgDurability > 25 ? "#ECC94B" : "#FF6B35",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Profile Page ──────────────────────────────────────────────────────

export default function AgentProfilePage() {
  const params = useParams();
  const agentId = parseInt(params.id as string, 10);

  const { details, loading: detailsLoading } = useAgentDetails(isNaN(agentId) ? null : agentId);
  const { data: chainData, lastSuccessAt, error: chainError } = useChainData();
  const { items: activityItems } = useActivityFeed();
  const { messages } = useSocialFeed(100);
  const { events: sabotageEvents, negotiations } = useSabotage();
  const { alliances } = useAlliances();

  // Filter data for this agent
  const agentActivity = useMemo(
    () => activityItems.filter((i) => i.agentId === agentId).slice(0, 50),
    [activityItems, agentId]
  );

  const agentMessages = useMemo(
    () => messages.filter((m) => m.agentId === agentId || m.mentionsAgent === agentId).slice(0, 30),
    [messages, agentId]
  );

  const agentCombat = useMemo(
    () => sabotageEvents.filter((e) => e.attackerAgentId === agentId || e.targetAgentId === agentId).slice(0, 20),
    [sabotageEvents, agentId]
  );

  const agentNegotiations = useMemo(
    () => negotiations.filter((n) => n.proposerAgentId === agentId || n.targetAgentId === agentId).slice(0, 10),
    [negotiations, agentId]
  );

  const agentAlliances = useMemo(
    () => alliances.filter((a) => a.members.includes(agentId)),
    [alliances, agentId]
  );

  if (isNaN(agentId)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#06080D" }}>
        <div className="text-center">
          <div className="text-4xl mb-4">?</div>
          <h1 className="text-lg font-bold text-gray-100 mb-2">Invalid Agent ID</h1>
          <Link href="/" className="text-sm" style={{ color: "#7B61FF" }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#06080D url('/assets/dark_space.png') center/cover fixed" }}>
      {/* Header */}
      <div className="sticky top-0 z-50">
        <HeaderBar
          era={chainData?.currentEra ?? 1}
          agentCount={chainData?.activeAgentCount ?? 0}
          totalBurned={chainData?.totalBurned ?? "0"}
          lastEventBlock={chainData?.lastEventBlock ?? "0"}
          eventCooldown={chainData?.eventCooldown ?? 75000}
          currentPath="/agents"
          networkStatus={{ lastRpcSuccess: lastSuccessAt, error: chainError }}
        />
      </div>

      {/* Breadcrumb */}
      <div className="px-4 py-2 border-b border-white/5" style={{ background: "#0D1117" }}>
        <div className="flex items-center gap-2 text-xs">
          <Link href="/" className="text-gray-500 hover:text-gray-300 transition-colors">
            Dashboard
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-300">Agent #{agentId}</span>
        </div>
      </div>

      {/* Loading / Not Found states */}
      {detailsLoading && !details ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-2xl mb-3 animate-pulse">...</div>
            <div className="text-sm text-gray-500">Loading agent data...</div>
          </div>
        </div>
      ) : !details ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-4xl mb-4">?</div>
            <h1 className="text-lg font-bold text-gray-100 mb-2">Agent #{agentId} not found</h1>
            <Link href="/" className="text-sm" style={{ color: "#7B61FF" }}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Hero section */}
          <div
            className="px-4 py-5 border-b border-white/5"
            style={{
              background: `linear-gradient(135deg, #06080D 0%, ${ZONE_COLORS[details.zone] || "#7B61FF"}10 100%)`,
            }}
          >
            <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-4">
              {/* Agent ID + badges */}
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-100" style={{ fontFamily: "monospace" }}>
                  Agent #{agentId}
                </h1>

                {details.pioneerPhase > 0 && (
                  <BadgeTooltip
                    title={BADGE_INFO.pioneer[details.pioneerPhase]?.title || `Pioneer P${details.pioneerPhase}`}
                    description={BADGE_INFO.pioneer[details.pioneerPhase]?.description || `Registered during Phase ${details.pioneerPhase}.`}
                    color="#7B61FF"
                  >
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
                      style={{ backgroundColor: "#7B61FF20", color: "#7B61FF", border: "1px solid #7B61FF40" }}
                    >
                      {PIONEER_BADGES[details.pioneerPhase] && (
                        <img src={PIONEER_BADGES[details.pioneerPhase]!} alt="" className="w-4 h-4" />
                      )}
                      PIONEER P{details.pioneerPhase}
                    </span>
                  </BadgeTooltip>
                )}

                <span className="inline-flex items-center gap-1 text-xs">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: details.active ? "#00E5A0" : "#4A5568",
                      boxShadow: details.active ? "0 0 6px #00E5A0" : undefined,
                    }}
                  />
                  <span style={{ color: details.active ? "#00E5A0" : "#6B7280" }}>
                    {details.active ? "Active" : "Hibernated"}
                  </span>
                </span>
              </div>

              {/* Operator address + explorer link */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-500 font-mono">{shortAddr(details.operator)}</span>
                <a
                  href={`https://testnet.monadexplorer.com/address/${details.operator}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-1 rounded transition-colors hover:opacity-90"
                  style={{ backgroundColor: "#7B61FF15", color: "#7B61FF", border: "1px solid #7B61FF30" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1" style={{ marginTop: -2 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Explorer
                </a>
              </div>
            </div>
          </div>

          {/* Main content grid */}
          <div className="p-4 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT COLUMN — Stats + Equipment */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Mining Stats */}
              <ErrorBoundary label="Mining Stats">
                <div className="rounded-lg p-4 glow-border animate-fade-in-up" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Section title="Mining">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <AnimatedMetric label="Total Mined" rawValue={details.totalMined} suffix="CHAOS" color="#00E5A0" />
                      <AnimatedMetric label="Pending" rawValue={details.pendingRewards} suffix="CHAOS" color="#ECC94B" />
                      <AnimatedMetric label="Hashrate" rawValue={details.hashrate} suffix="H/s" color="#00E5A0" decimals={0} />
                      <AnimatedMetric label="Resilience" rawValue={details.cosmicResilience} color="#60A5FA" decimals={0} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <AnimatedMetric label="Wallet Balance" rawValue={details.walletBalance} suffix="CHAOS" color="#00E5A0" />
                      <Metric label="Zone" value={ZONE_NAMES[details.zone] || `Zone ${details.zone}`} />
                    </div>
                  </Section>
                </div>
              </ErrorBoundary>

              {/* Zone */}
              <ErrorBoundary label="Zone Info">
                <div className="rounded-lg overflow-hidden glow-border animate-fade-in-up" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", animationDelay: "50ms" }}>
                  <div
                    className="p-4 flex items-center gap-3"
                    style={{
                      backgroundImage: `linear-gradient(90deg, #0D1117 40%, transparent), url(${ZONE_IMAGES[details.zone]})`,
                      backgroundSize: "cover",
                      backgroundPosition: "right center",
                      minHeight: 80,
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ZONE_COLORS[details.zone] || "#666" }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-200">
                        {ZONE_NAMES[details.zone] || `Zone ${details.zone}`}
                      </div>
                      <div className="text-xs text-gray-500">Current zone</div>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>

              {/* Equipment: Rigs */}
              <ErrorBoundary label="Rigs">
                <div className="rounded-lg p-4 glow-border animate-fade-in-up" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", animationDelay: "100ms" }}>
                  <RigSection rigs={details.rigs} slots={details.facility.slots} />
                </div>
              </ErrorBoundary>

              {/* Facility */}
              <ErrorBoundary label="Facility">
                <div className="rounded-lg p-4 glow-border animate-fade-in-up" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", animationDelay: "150ms" }}>
                  <Section title="Facility">
                    <div className="rounded-lg p-3 border border-white/5" style={{ backgroundColor: "#06080D" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={FACILITY_IMAGES[details.facility.level - 1] || FACILITY_IMAGES[0]}
                          alt=""
                          className="w-10 h-10 object-contain rounded"
                        />
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "#7B61FF20", color: "#7B61FF", border: "1px solid #7B61FF40" }}
                        >
                          L{details.facility.level}
                        </span>
                        <span className="text-sm text-gray-200">
                          {FACILITY_NAMES[details.facility.level - 1] || `Level ${details.facility.level}`}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Slots: </span>
                          <span className="text-gray-300" style={{ fontFamily: "monospace" }}>{details.facility.slots}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Power: </span>
                          <span className="text-gray-300" style={{ fontFamily: "monospace" }}>{details.facility.powerOutput}W</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Shelter: </span>
                          <span className="text-gray-300" style={{ fontFamily: "monospace" }}>{details.facility.shelterRating}%</span>
                        </div>
                      </div>
                      {details.facility.maxCondition > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-500">Condition</span>
                            <span className="text-gray-400" style={{ fontFamily: "monospace" }}>
                              {((details.facility.condition / details.facility.maxCondition) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${(details.facility.condition / details.facility.maxCondition) * 100}%`,
                                backgroundColor:
                                  (details.facility.condition / details.facility.maxCondition) > 0.5
                                    ? "#7B61FF"
                                    : (details.facility.condition / details.facility.maxCondition) > 0.25
                                    ? "#ECC94B"
                                    : "#FF6B35",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Section>
                </div>
              </ErrorBoundary>

              {/* Shield */}
              <ErrorBoundary label="Shield">
                <div className="rounded-lg p-4 glow-border animate-fade-in-up" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", animationDelay: "200ms" }}>
                  <Section title="Shield">
                    {details.shield.tier === 0 ? (
                      <div className="text-xs text-gray-500">No shield equipped</div>
                    ) : (
                      <div className="rounded-lg p-3 border border-white/5" style={{ backgroundColor: "#06080D" }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {SHIELD_IMAGES[details.shield.tier] && (
                              <img src={SHIELD_IMAGES[details.shield.tier]!} alt="" className="w-8 h-8 object-contain" />
                            )}
                            <span
                              className="text-xs font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "#3498DB20", color: "#3498DB", border: "1px solid #3498DB40" }}
                            >
                              T{details.shield.tier}
                            </span>
                            <span className="text-sm text-gray-200">
                              {SHIELD_NAMES[details.shield.tier] || `Tier ${details.shield.tier}`}
                            </span>
                          </div>
                          <span className="text-xs" style={{ color: details.shield.active ? "#00E5A0" : "#6B7280" }}>
                            {details.shield.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Absorption: </span>
                            <span className="text-gray-300" style={{ fontFamily: "monospace" }}>{details.shield.absorption}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Charges: </span>
                            <span className="text-gray-300" style={{ fontFamily: "monospace" }}>{details.shield.charges}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </Section>
                </div>
              </ErrorBoundary>

              {/* On-Chain Info */}
              <div className="rounded-lg p-4 glow-border animate-fade-in-up" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", animationDelay: "250ms" }}>
                <Section title="On-Chain">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Registration Block: </span>
                      <span className="text-gray-400" style={{ fontFamily: "monospace" }}>{details.registrationBlock}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Heartbeat: </span>
                      <span className="text-gray-400" style={{ fontFamily: "monospace" }}>{details.lastHeartbeat}</span>
                    </div>
                  </div>
                </Section>
              </div>
            </div>

            {/* RIGHT COLUMN — Activity + Social + Combat + Alliances */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Activity Timeline */}
              <ErrorBoundary label="Activity Timeline">
                <div className="rounded-lg p-4 glow-border animate-fade-in-up" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", animationDelay: "50ms" }}>
                  <Section title={`Activity (${agentActivity.length})`}>
                    {agentActivity.length === 0 ? (
                      <div className="text-xs text-gray-500 text-center py-4">No on-chain activity found</div>
                    ) : (
                      <div className="space-y-1.5 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                        {agentActivity.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 rounded p-2 text-xs card-hover"
                            style={{ background: "rgba(255,255,255,0.03)" }}
                          >
                            <ActivityTypeTag type={item.type} />
                            <span className="text-gray-300 flex-1 truncate">{item.detail}</span>
                            <span className="text-gray-600 shrink-0 font-mono text-[10px]">
                              #{item.blockNumber.toString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>
                </div>
              </ErrorBoundary>

              {/* Social Posts */}
              <ErrorBoundary label="Social Posts">
                <div className="rounded-lg p-4 glow-border animate-fade-in-up" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", animationDelay: "100ms" }}>
                  <Section title={`Social Posts (${agentMessages.length})`}>
                    {agentMessages.length === 0 ? (
                      <div className="text-xs text-gray-500 text-center py-4">No social posts yet</div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                        {agentMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className="rounded-lg p-3"
                            style={{ background: "rgba(255,255,255,0.02)", borderLeft: "3px solid #7B61FF40" }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{msg.agentEmoji}</span>
                                <span className="text-xs text-gray-400">{msg.agentTitle}</span>
                                <span
                                  className="text-xs px-1 py-0.5 rounded"
                                  style={{
                                    background: "rgba(123,97,255,0.1)",
                                    color: "#9B8FFF",
                                    fontSize: 10,
                                  }}
                                >
                                  {msg.type.replace(/_/g, " ")}
                                </span>
                              </div>
                              <span className="text-xs text-gray-600">{timeAgo(msg.timestamp)}</span>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">{msg.text}</p>
                            {msg.mentionsAgent && msg.mentionsAgent !== agentId && (
                              <div className="mt-1 text-xs text-gray-600">@Agent #{msg.mentionsAgent}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>
                </div>
              </ErrorBoundary>

              {/* Combat Record */}
              <ErrorBoundary label="Combat Record">
                <div className="rounded-lg p-4 glow-border animate-fade-in-up" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", animationDelay: "150ms" }}>
                  <Section title={`Combat Record (${agentCombat.length})`}>
                    {agentCombat.length === 0 && agentNegotiations.length === 0 ? (
                      <div className="text-xs text-gray-500 text-center py-4">No combat history</div>
                    ) : (
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                        {agentCombat.map((evt) => {
                          const isAttacker = evt.attackerAgentId === agentId;
                          return (
                            <div
                              key={evt.id}
                              className="rounded p-2 text-xs"
                              style={{
                                background: isAttacker ? "rgba(255,107,53,0.06)" : "rgba(255,68,68,0.06)",
                                borderLeft: `3px solid ${isAttacker ? "#FF6B35" : "#FF4444"}`,
                              }}
                            >
                              <div className="flex items-center gap-2 mb-0.5">
                                <span
                                  className="px-1.5 py-0.5 rounded font-bold"
                                  style={{
                                    background: isAttacker ? "#FF6B3520" : "#FF444420",
                                    color: isAttacker ? "#FF6B35" : "#FF4444",
                                  }}
                                >
                                  {isAttacker ? "ATK" : "DEF"}
                                </span>
                                <span className="text-gray-400">{evt.type.replace(/_/g, " ")}</span>
                                <span className="text-gray-600 ml-auto">{timeAgo(evt.timestamp)}</span>
                              </div>
                              <div className="text-gray-300">
                                {isAttacker
                                  ? `Attacked Agent #${evt.targetAgentId}`
                                  : `Attacked by Agent #${evt.attackerAgentId}`}
                                {evt.damage > 0 && (
                                  <span className="text-red-400 ml-1">-{evt.damage} dmg</span>
                                )}
                              </div>
                              {evt.narrative && (
                                <p className="text-gray-500 mt-1 italic">{evt.narrative}</p>
                              )}
                            </div>
                          );
                        })}

                        {/* Negotiations */}
                        {agentNegotiations.map((neg) => {
                          const isProposer = neg.proposerAgentId === agentId;
                          const outcomeColor = neg.outcome === "accepted" ? "#00E5A0" : neg.outcome === "rejected" ? "#FF4444" : "#6B7280";
                          return (
                            <div
                              key={neg.id}
                              className="rounded p-2 text-xs"
                              style={{ background: "rgba(123,97,255,0.04)", borderLeft: "3px solid #7B61FF40" }}
                            >
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: "#7B61FF20", color: "#7B61FF" }}>
                                  NEG
                                </span>
                                <span className="text-gray-400">
                                  {isProposer ? `Proposed to #${neg.targetAgentId}` : `Received from #${neg.proposerAgentId}`}
                                </span>
                                <span className="px-1 py-0.5 rounded" style={{ background: `${outcomeColor}20`, color: outcomeColor }}>
                                  {neg.outcome}
                                </span>
                                <span className="text-gray-600 ml-auto">{timeAgo(neg.timestamp)}</span>
                              </div>
                              <div className="text-gray-500">{neg.terms}</div>
                              {neg.response && <div className="text-gray-400 mt-0.5 italic">{neg.response}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Section>
                </div>
              </ErrorBoundary>

              {/* Alliance History */}
              <ErrorBoundary label="Alliances">
                <div className="rounded-lg p-4 glow-border animate-fade-in-up" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", animationDelay: "200ms" }}>
                  <Section title={`Alliances (${agentAlliances.length})`}>
                    {agentAlliances.length === 0 ? (
                      <div className="text-xs text-gray-500 text-center py-4">No alliances</div>
                    ) : (
                      <div className="space-y-2">
                        {agentAlliances.map((alliance) => {
                          const partner = alliance.members[0] === agentId ? alliance.members[1] : alliance.members[0];
                          const color = alliance.active ? "#00E5A0" : alliance.endReason === "betrayal" ? "#FF4444" : "#6B7280";
                          return (
                            <div
                              key={alliance.id}
                              className="rounded-lg p-3 border"
                              style={{
                                backgroundColor: "#06080D",
                                borderColor: `${color}30`,
                                borderLeftWidth: 3,
                                borderLeftColor: color,
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold" style={{ color }}>
                                    {alliance.name || "Alliance"}
                                  </span>
                                  <Link
                                    href={`/agents/${partner}`}
                                    className="text-xs font-mono hover:underline"
                                    style={{ color: "#7B61FF" }}
                                  >
                                    with #{partner}
                                  </Link>
                                </div>
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ background: `${color}20`, color }}
                                >
                                  {alliance.active ? "Active" : alliance.endReason || "Ended"}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>Strength: {alliance.strength}</span>
                                <span>{ZONE_NAMES[alliance.zone]?.replace("The ", "") || `Zone ${alliance.zone}`}</span>
                                {alliance.betrayedBy && (
                                  <span className="text-red-400">
                                    Betrayed by #{alliance.betrayedBy}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Section>
                </div>
              </ErrorBoundary>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Activity type tag ──────────────────────────────────────────────────────

const ACTIVITY_COLORS: Record<string, string> = {
  Register: "#7B61FF",
  Heartbeat: "#00E5A0",
  Reward: "#ECC94B",
  "Rig Buy": "#48BB78",
  "Rig Equip": "#3498DB",
  Facility: "#7B61FF",
  Shield: "#3498DB",
  Event: "#FF6B35",
  Migrate: "#00D4FF",
};

function ActivityTypeTag({ type }: { type: string }) {
  const color = ACTIVITY_COLORS[type] || "#6B7280";
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0"
      style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
    >
      {type}
    </span>
  );
}
