"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAgentDetails, RigInfo } from "../hooks/useAgentDetails";
import { ZONE_NAMES, ZONE_COLORS, ZONE_IMAGES, RIG_NAMES, RIG_IMAGES, FACILITY_NAMES, FACILITY_IMAGES, SHIELD_NAMES, SHIELD_IMAGES, RIG_TIER_COLORS, PIONEER_BADGES } from "../lib/constants";
import BadgeTooltip, { BADGE_INFO } from "./BadgeTooltip";

function fmt(val: string, decimals = 2): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

interface Props {
  agentId: number;
  onClose: () => void;
}

export default function AgentDetailPanel({ agentId, onClose }: Props) {
  const { details, loading } = useAgentDetails(agentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border animate-scale-in"
        style={{ backgroundColor: "#0D1117", borderColor: "#7B61FF40", boxShadow: "0 0 60px rgba(123, 97, 255, 0.1), 0 0 120px rgba(123, 97, 255, 0.05)" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-white/10"
          style={{ backgroundColor: "#06080D" }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-100" style={{ fontFamily: "monospace" }}>
              Agent #{agentId}
            </h2>
            {details?.pioneerPhase && details.pioneerPhase > 0 && (
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
            {details && (
              <span className="inline-flex items-center gap-1 text-xs">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: details.active ? "#00E5A0" : "#4A5568" }}
                />
                <span style={{ color: details.active ? "#00E5A0" : "#6B7280" }}>
                  {details.active ? "Active" : "Hibernated"}
                </span>
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg px-2">&times;</button>
        </div>

        {loading && !details ? (
          <div className="p-8 text-center text-gray-500">Loading agent data...</div>
        ) : !details ? (
          <div className="p-8 text-center text-gray-500">Agent not found</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Wallet */}
            <Section title="Wallet">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Operator" value={shortAddr(details.operator)} mono />
                <Metric label="Balance" value={`${fmt(details.walletBalance)} CHAOS`} color="#00E5A0" />
              </div>
            </Section>

            {/* Mining */}
            <Section title="Mining">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Total Mined" value={`${fmt(details.totalMined)} CHAOS`} color="#00E5A0" />
                <Metric label="Pending Rewards" value={`${fmt(details.pendingRewards)} CHAOS`} color="#ECC94B" />
                <Metric label="Hashrate" value={`${fmt(details.hashrate, 0)} H/s`} color="#00E5A0" />
                <Metric label="Resilience" value={fmt(details.cosmicResilience, 0)} color="#60A5FA" />
              </div>
            </Section>

            {/* Zone */}
            <Section title="Zone">
              <div
                className="rounded-lg p-3 border border-white/5 flex items-center gap-3 overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(90deg, #06080D 50%, transparent), url(${ZONE_IMAGES[details.zone]})`,
                  backgroundSize: "cover",
                  backgroundPosition: "right center",
                }}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ZONE_COLORS[details.zone] || "#666" }}
                />
                <span className="text-sm text-gray-200 font-medium">
                  {ZONE_NAMES[details.zone] || `Zone ${details.zone}`}
                </span>
              </div>
            </Section>

            {/* Rigs — tabbed view */}
            <RigSection rigs={details.rigs} slots={details.facility.slots} />

            {/* Facility */}
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
                {/* Condition bar */}
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

            {/* Shield */}
            <Section title="Shield">
              {details.shield.tier === 0 ? (
                <div className="text-xs text-gray-500">No shield equipped</div>
              ) : (
                <div className="rounded-lg p-3 border border-white/5" style={{ backgroundColor: "#06080D" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {SHIELD_IMAGES[details.shield.tier] && (
                        <img
                          src={SHIELD_IMAGES[details.shield.tier]!}
                          alt=""
                          className="w-8 h-8 object-contain"
                        />
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

            {/* Chain Info */}
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
              <a
                href={`https://testnet.monadexplorer.com/address/${details.operator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                style={{
                  backgroundColor: "#7B61FF15",
                  color: "#7B61FF",
                  border: "1px solid #7B61FF30",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                View on Monad Explorer
              </a>
            </Section>

            {/* Full Profile Link */}
            <Link
              href={`/agents/${agentId}`}
              onClick={onClose}
              className="mt-2 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-xs font-medium transition-all hover:brightness-125"
              style={{
                backgroundColor: "#00E5A015",
                color: "#00E5A0",
                border: "1px solid #00E5A030",
              }}
            >
              View full profile
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Rig Section with Equipped / Inventory tabs ────────────────────────────

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
    .sort(([a], [b]) => b - a) // highest tier first
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

      {/* Tabs */}
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

      {/* Grouped rig cards */}
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
    <div
      className="rounded-lg p-3 border border-white/5"
      style={{ backgroundColor: "#06080D" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src={RIG_IMAGES[tier] || RIG_IMAGES[0]}
            alt=""
            className="w-8 h-8 object-contain"
          />
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${tierColor}20`,
              color: tierColor,
              border: `1px solid ${tierColor}40`,
            }}
          >
            T{tier}
          </span>
          <span className="text-sm text-gray-200">
            {RIG_NAMES[tier] || `Tier ${tier} Rig`}
          </span>
        </div>
        {/* Count badge */}
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: `${tierColor}15`,
            color: tierColor,
            border: `1px solid ${tierColor}30`,
          }}
        >
          {tierRigs.length > 1 ? `×${tierRigs.length}` : "#" + tierRigs[0].rigId}
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

      {/* Average durability bar */}
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
