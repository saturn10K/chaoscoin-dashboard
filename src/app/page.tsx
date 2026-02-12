"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useChainData } from "../hooks/useChainData";
import { useAgents } from "../hooks/useAgents";
import { useCosmicEvents } from "../hooks/useCosmicEvents";
import { useSabotage } from "../hooks/useSabotage";
import { useAlliances } from "../hooks/useSocialFeed";
import HeaderBar from "../components/HeaderBar";
import ZoneMap from "../components/ZoneMap";
import Leaderboard from "../components/Leaderboard";
import SupplyMetrics from "../components/SupplyMetrics";
import AgentDetailPanel from "../components/AgentDetailPanel";
import MvpSpotlight from "../components/MvpSpotlight";
import WelcomeGuide from "../components/WelcomeGuide";
import ErrorBoundary from "../components/ErrorBoundary";

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
        setTimeout(() => setPulsingZones(new Set()), 2000);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const startTimer = setTimeout(checkForNewMessages, 2000);
    const interval = setInterval(checkForNewMessages, 15_000);
    return () => { clearTimeout(startTimer); clearInterval(interval); };
  }, [checkForNewMessages]);

  return pulsingZones;
}

// Dynamic imports with SSR disabled — these use Date.now() / real-time data
const ActivityFeed = dynamic(() => import("../components/ActivityFeed"), { ssr: false });
const SocialFeed = dynamic(() => import("../components/SocialFeed"), { ssr: false });
const StatusTicker = dynamic(() => import("../components/StatusTicker"), { ssr: false });

// Dynamic imports for overlay components (use Date.now for timers)
const KillFeed = dynamic(() => import("../components/KillFeed"), { ssr: false });
const EventToasts = dynamic(() => import("../components/EventToasts"), { ssr: false });
const CosmicFlashOverlay = dynamic(() => import("../components/CosmicFlashOverlay"), { ssr: false });
const RivalryGraph = dynamic(() => import("../components/RivalryGraph"), { ssr: false });

export default function Dashboard() {
  const { data, loading, error, lastSuccessAt } = useChainData();
  const { agents, currentBlock } = useAgents(data?.totalAgents ?? 0);
  const { events } = useCosmicEvents(data?.totalEvents ?? 0);
  const { events: sabotageEvents, stats: sabotageStats } = useSabotage();
  const { alliances, events: allianceEvents } = useAlliances();
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const pulsingZones = useZonePulse();

  const isLive = data !== null;

  return (
    <div className="min-h-screen" style={{ background: "#06080D url('/assets/dark_space.png') center/cover fixed" }}>
      {/* ─── Fixed overlay layers ─── */}
      <KillFeed sabotageEvents={sabotageEvents} allianceEvents={allianceEvents} />
      <EventToasts
        sabotageEvents={sabotageEvents}
        allianceEvents={allianceEvents}
        cosmicEvents={events}
        agents={agents}
      />
      <CosmicFlashOverlay cosmicEvents={events} />

      {/* ─── Sticky header + ticker ─── */}
      <div className="sticky top-0 z-50">
        <HeaderBar
          era={data?.currentEra ?? 1}
          agentCount={data?.activeAgentCount ?? 0}
          totalBurned={data?.totalBurned ?? "0"}
          lastEventBlock={data?.lastEventBlock ?? "0"}
          eventCooldown={data?.eventCooldown ?? 75000}
          networkStatus={{ lastRpcSuccess: lastSuccessAt, error }}
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

      {/* ─── Main grid ─── */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ minHeight: "calc(100vh - 100px)" }}>
        {/* Left column: Zone Map + MVP Spotlight + Leaderboard */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <ErrorBoundary label="Zone Map">
            <div className="animate-fade-in-up">
              <ZoneMap
                zoneCounts={data?.zoneCounts ?? [0, 0, 0, 0, 0, 0, 0, 0]}
                totalAgents={data?.totalAgents ?? 0}
                agents={agents}
                onSelectAgent={setSelectedAgent}
                pulsingZones={pulsingZones}
                sabotageEvents={sabotageEvents}
                cosmicEvents={events}
              />
            </div>
          </ErrorBoundary>

          {/* MVP Spotlight — between ZoneMap and Leaderboard */}
          <ErrorBoundary label="MVP Spotlight">
            <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
              <MvpSpotlight agents={agents} sabotageStats={sabotageStats} />
            </div>
          </ErrorBoundary>

          <ErrorBoundary label="Leaderboard">
            <div className="flex-1 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <Leaderboard agents={agents} currentBlock={currentBlock} onSelectAgent={setSelectedAgent} />
            </div>
          </ErrorBoundary>
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Social Feed */}
          <ErrorBoundary label="Social Feed">
            <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
              <SocialFeed cosmicEvents={events} currentBlock={Number(currentBlock)} />
            </div>
          </ErrorBoundary>

          {/* Rivalry Graph — replaces old chain info box */}
          <ErrorBoundary label="Rivalry Network">
            <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <RivalryGraph agents={agents} sabotageEvents={sabotageEvents} alliances={alliances} />
            </div>
          </ErrorBoundary>

          {/* Activity Feed */}
          <ErrorBoundary label="Activity Feed">
            <div className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
              <ActivityFeed cosmicEvents={events} currentBlock={currentBlock} />
            </div>
          </ErrorBoundary>

          <ErrorBoundary label="Supply Metrics">
            <div className="animate-fade-in-up" style={{ animationDelay: "180ms" }}>
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
          </ErrorBoundary>
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
