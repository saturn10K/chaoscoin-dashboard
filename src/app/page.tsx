"use client";

import { useState } from "react";
import { useChainData } from "../hooks/useChainData";
import { useAgents } from "../hooks/useAgents";
import { useCosmicEvents } from "../hooks/useCosmicEvents";
import HeaderBar from "../components/HeaderBar";
import ZoneMap from "../components/ZoneMap";
import Leaderboard from "../components/Leaderboard";
import CosmicFeed from "../components/CosmicFeed";
import SupplyMetrics from "../components/SupplyMetrics";
import AgentDetailPanel from "../components/AgentDetailPanel";
import ActivityFeed from "../components/ActivityFeed";

export default function Dashboard() {
  const { data, loading, error } = useChainData();
  const { agents, currentBlock } = useAgents(data?.totalAgents ?? 0);
  const { events } = useCosmicEvents(data?.totalEvents ?? 0);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);

  const isLive = data !== null;

  return (
    <div className="min-h-screen" style={{ background: "#06080D url('/assets/dark_space.png') center/cover fixed" }}>
      {/* Header */}
      <HeaderBar
        era={data?.currentEra ?? 1}
        agentCount={data?.activeAgentCount ?? 0}
        totalBurned={data?.totalBurned ?? "0"}
        lastEventBlock={data?.lastEventBlock ?? "0"}
        eventCooldown={data?.eventCooldown ?? 75000}
      />

      {/* Status bar */}
      <div className="px-4 py-1 text-xs" style={{ background: "#0D1117" }}>
        {loading ? (
          <span className="text-gray-500">Connecting to Monad Testnet...</span>
        ) : error ? (
          <span className="text-yellow-500">
            Connection error: {error}
          </span>
        ) : isLive ? (
          <span style={{ color: "#00E5A0" }}>
            ● Live on Monad Testnet | Genesis Phase {data.genesisPhase} | Era {data.currentEra} | {data.totalAgents} total agents | {data.activeAgentCount} active
          </span>
        ) : (
          <span className="text-yellow-500">
            Demo mode — deploy contracts and set NEXT_PUBLIC_*_ADDRESS env vars to connect
          </span>
        )}
      </div>

      {/* Main grid */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ minHeight: "calc(100vh - 100px)" }}>
        {/* Left column: Zone Map + Leaderboard */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <ZoneMap
            zoneCounts={data?.zoneCounts ?? [0, 0, 0, 0, 0, 0, 0, 0]}
            totalAgents={data?.totalAgents ?? 0}
            agents={agents}
            onSelectAgent={setSelectedAgent}
          />

          <div className="rounded-lg p-4 flex-1" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)" }}>
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

        {/* Right column: Cosmic Feed + Supply Metrics */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-lg p-4" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: "#7B61FF" }}>
              Cosmic Events
            </h2>
            {isLive && data.totalEvents === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No cosmic events yet. The calm before the storm...
              </div>
            ) : !isLive ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Waiting for chain connection...
              </div>
            ) : (
              <CosmicFeed events={events} />
            )}
          </div>

          {/* Activity Feed */}
          <ActivityFeed />

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
            }}
          />

          {/* Live chain info */}
          {isLive && (
            <div className="rounded-lg p-3 text-xs" style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.05)" }}>
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
    </div>
  );
}
