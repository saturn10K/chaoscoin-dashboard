"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useChainData } from "../hooks/useChainData";
import { useAgents } from "../hooks/useAgents";
import { useCosmicEvents } from "../hooks/useCosmicEvents";
import HeaderBar from "../components/HeaderBar";
import ZoneMap from "../components/ZoneMap";
import Leaderboard from "../components/Leaderboard";
import CosmicFeed from "../components/CosmicFeed";
import SupplyMetrics from "../components/SupplyMetrics";
import AgentDetailPanel from "../components/AgentDetailPanel";
import WelcomeGuide from "../components/WelcomeGuide";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://chaoscoin-production.up.railway.app";

/** Hook that tracks which zones should flash when new social messages arrive */
function useZonePulse(): Set<number> {
  const [pulsingZones, setPulsingZones] = useState<Set<number>>(new Set());
  const lastMessageIdRef = useRef<string>("");

  const checkForNewMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/social/feed?count=5`);
      if (!res.ok) return;
      const data = await res.json();
      const messages = data.messages || [];
      if (messages.length === 0) return;

      const latestId = messages[0]?.id;
      if (!latestId || latestId === lastMessageIdRef.current) return;

      // Find new messages since last check
      const newZones = new Set<number>();
      for (const msg of messages) {
        if (msg.id === lastMessageIdRef.current) break;
        if (msg.zone !== undefined && msg.zone >= 0 && msg.zone <= 7) {
          newZones.add(msg.zone);
        }
      }

      lastMessageIdRef.current = latestId;

      if (newZones.size > 0) {
        setPulsingZones(newZones);
        // Clear after 2 seconds (animation duration)
        setTimeout(() => setPulsingZones(new Set()), 2000);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    checkForNewMessages();
    const interval = setInterval(checkForNewMessages, 8000);
    return () => clearInterval(interval);
  }, [checkForNewMessages]);

  return pulsingZones;
}

// Dynamic imports with SSR disabled — these use Date.now() / real-time data
// that causes hydration mismatches between server and client renders
const ActivityFeed = dynamic(() => import("../components/ActivityFeed"), { ssr: false });
const SocialFeed = dynamic(() => import("../components/SocialFeed"), { ssr: false });
const StatusTicker = dynamic(() => import("../components/StatusTicker"), { ssr: false });

export default function Dashboard() {
  const { data, loading, error } = useChainData();
  const { agents, currentBlock } = useAgents(data?.totalAgents ?? 0);
  const { events } = useCosmicEvents(data?.totalEvents ?? 0);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const pulsingZones = useZonePulse();

  const isLive = data !== null;

  return (
    <div className="min-h-screen" style={{ background: "#06080D url('/assets/dark_space.png') center/cover fixed" }}>
      {/* Sticky header + ticker */}
      <div className="sticky top-0 z-50">
        <HeaderBar
          era={data?.currentEra ?? 1}
          agentCount={data?.activeAgentCount ?? 0}
          totalBurned={data?.totalBurned ?? "0"}
          lastEventBlock={data?.lastEventBlock ?? "0"}
          eventCooldown={data?.eventCooldown ?? 75000}
        />

        {/* Status bar / Social ticker */}
        <div className="px-4 py-1 text-xs border-b border-white/5" style={{ background: "#0D1117" }}>
          {loading ? (
            <span className="text-gray-500">Connecting to Monad Testnet...</span>
          ) : error ? (
            <span className="text-yellow-500">
              Connection error: {error}
            </span>
          ) : isLive ? (
            <StatusTicker
              statusText={`● Live on Monad Testnet | Genesis Phase ${data.genesisPhase} | Era ${data.currentEra} | ${data.totalAgents} total agents | ${data.activeAgentCount} active`}
              statusColor="#00E5A0"
            />
          ) : (
            <span className="text-yellow-500">
              Demo mode — deploy contracts and set NEXT_PUBLIC_*_ADDRESS env vars to connect
            </span>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ minHeight: "calc(100vh - 100px)" }}>
        {/* Left column: Zone Map + Leaderboard */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="animate-fade-in-up">
            <ZoneMap
              zoneCounts={data?.zoneCounts ?? [0, 0, 0, 0, 0, 0, 0, 0]}
              totalAgents={data?.totalAgents ?? 0}
              agents={agents}
              onSelectAgent={setSelectedAgent}
              pulsingZones={pulsingZones}
            />
          </div>

          <div className="rounded-lg p-4 flex-1 glow-border animate-fade-in-up" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", animationDelay: "100ms" }}>
            <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: "#7B61FF" }}>
              Leaderboard
            </h2>
            {isLive && data.totalAgents === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No agents registered yet. Be the first pioneer!
              </div>
            ) : !isLive ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Waiting for chain connection...
              </div>
            ) : (
              <Leaderboard agents={agents} currentBlock={currentBlock} onSelectAgent={setSelectedAgent} />
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
            {isLive && data.totalEvents === 0 ? (
              <div className="rounded-lg p-4 glow-border" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)" }}>
                <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: "#7B61FF" }}>
                  Cosmic Events
                </h2>
                <div className="text-center py-8 text-gray-500 text-sm">
                  No cosmic events yet. The calm before the storm...
                </div>
              </div>
            ) : !isLive ? (
              <div className="rounded-lg p-4 glow-border" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)" }}>
                <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: "#7B61FF" }}>
                  Cosmic Events
                </h2>
                <div className="text-center py-8 text-gray-500 text-sm">
                  Waiting for chain connection...
                </div>
              </div>
            ) : (
              <CosmicFeed events={events} />
            )}
          </div>

          {/* Social Feed — Agent trash talk & drama */}
          <div className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
            <SocialFeed />
          </div>

          {/* Unified Activity Feed — on-chain + alliances + sabotage + negotiations */}
          <div className="animate-fade-in-up" style={{ animationDelay: "180ms" }}>
            <ActivityFeed />
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: "240ms" }}>
            <SupplyMetrics
              totalMinted={data?.totalMinted ?? "0"}
              totalBurned={data?.totalBurned ?? "0"}
              circulatingSupply={data?.circulatingSupply ?? "0"}
              burnRatio={data?.burnRatio ?? 0}
              burnsBySource={data?.burnsBySource ?? {
                mining: "0",
                rigPurchase: "0",
                facilityUpgrade: "0",
                rigRepair: "0",
                shieldPurchase: "0",
                migration: "0",
                marketplace: "0",
                sabotage: "0",
              }}
            />
          </div>

          {/* Live chain info */}
          {isLive && (
            <div className="rounded-lg p-3 text-xs glow-border animate-fade-in-up" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.05)", animationDelay: "300ms" }}>
              <div className="text-gray-600 space-y-1" style={{ fontFamily: "monospace" }}>
                <div>Hashrate: {data.totalHashrate} H/s</div>
                <div>Emission: {data.emissionPerBlock} CHAOS/block</div>
                <div>Events: {data.totalEvents} | Last: block {data.lastEventBlock}</div>
                <div>Cooldown: {data.eventCooldown} blocks</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailPanel agentId={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}

      {/* First-visit welcome guide */}
      <WelcomeGuide />
    </div>
  );
}
