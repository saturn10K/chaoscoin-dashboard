"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { formatEther } from "viem";
import {
  publicClient,
  ADDRESSES,
  CHAOS_TOKEN_ABI,
  TOKEN_BURNER_ABI,
  AGENT_REGISTRY_ABI,
  ERA_MANAGER_ABI,
  ZONE_MANAGER_ABI,
  MINING_ENGINE_ABI,
  COSMIC_ENGINE_ABI,
} from "../lib/contracts";

export interface ChainData {
  // Supply
  totalMinted: string;
  totalBurned: string;
  circulatingSupply: string;
  burnRatio: number;
  burnsBySource: { mining: string; rigPurchase: string; facilityUpgrade: string; rigRepair: string; shieldPurchase: string; migration: string; marketplace: string; sabotage: string };
  // Agents
  activeAgentCount: number;
  totalAgents: number;
  genesisPhase: number;
  // Era
  currentEra: number;
  eventCooldown: number;
  // Mining
  totalHashrate: string;
  emissionPerBlock: string;
  // Events
  totalEvents: number;
  lastEventBlock: string;
  // Zones
  zoneCounts: number[];
}

const POLL_INTERVAL = 15_000; // 15s
const ZERO = "0x0000000000000000000000000000000000000000" as const;

export function useChainData() {
  const [data, setData] = useState<ChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevRef = useRef<ChainData | null>(null);
  const isMountedRef = useRef(true);
  const lastSuccessRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
    // Skip if addresses are zeros (not deployed)
    if (ADDRESSES.chaosToken === ZERO) {
      setData(null);
      setLoading(false);
      return;
    }

    const prev = prevRef.current;

    try {
      // With multicall batching enabled on publicClient, all these concurrent
      // readContract calls are automatically batched into a single multicall3
      // RPC request (one network round-trip instead of 28+).
      //
      // We use individual readContract calls (not client.multicall) because
      // it's simpler and viem's batch.multicall transport handles aggregation.
      const results = await Promise.all([
        // [0] Supply
        publicClient.readContract({ address: ADDRESSES.chaosToken, abi: CHAOS_TOKEN_ABI, functionName: "totalMinted" }).catch(() => prev ? BigInt(Math.round(parseFloat(prev.totalMinted) * 1e18)) : 0n),
        // [1]
        publicClient.readContract({ address: ADDRESSES.chaosToken, abi: CHAOS_TOKEN_ABI, functionName: "totalBurned" }).catch(() => prev ? BigInt(Math.round(parseFloat(prev.totalBurned) * 1e18)) : 0n),
        // [2]
        publicClient.readContract({ address: ADDRESSES.chaosToken, abi: CHAOS_TOKEN_ABI, functionName: "totalSupply" }).catch(() => prev ? BigInt(Math.round(parseFloat(prev.circulatingSupply) * 1e18)) : 0n),
        // [3] Agents
        publicClient.readContract({ address: ADDRESSES.agentRegistry, abi: AGENT_REGISTRY_ABI, functionName: "activeAgentCount" }).catch(() => BigInt(prev?.activeAgentCount ?? 0)),
        // [4]
        publicClient.readContract({ address: ADDRESSES.agentRegistry, abi: AGENT_REGISTRY_ABI, functionName: "nextAgentId" }).catch(() => BigInt((prev?.totalAgents ?? 0) + 1)),
        // [5]
        publicClient.readContract({ address: ADDRESSES.agentRegistry, abi: AGENT_REGISTRY_ABI, functionName: "getGenesisPhase" }).catch(() => prev?.genesisPhase ?? 0),
        // [6] Era
        publicClient.readContract({ address: ADDRESSES.eraManager, abi: ERA_MANAGER_ABI, functionName: "getCurrentEra" }).catch(() => prev?.currentEra ?? 1),
        // [7]
        publicClient.readContract({ address: ADDRESSES.eraManager, abi: ERA_MANAGER_ABI, functionName: "getEventCooldown" }).catch(() => BigInt(prev?.eventCooldown ?? 75000)),
        // [8] Mining
        publicClient.readContract({ address: ADDRESSES.miningEngine, abi: MINING_ENGINE_ABI, functionName: "totalEffectiveHashrate" }).catch(() => BigInt(prev?.totalHashrate ?? "0")),
        // [9]
        publicClient.readContract({ address: ADDRESSES.miningEngine, abi: MINING_ENGINE_ABI, functionName: "calculateAdaptiveEmission" }).catch(() => prev ? BigInt(Math.round(parseFloat(prev.emissionPerBlock) * 1e18)) : 0n),
        // [10] Events
        publicClient.readContract({ address: ADDRESSES.cosmicEngine, abi: COSMIC_ENGINE_ABI, functionName: "nextEventId" }).catch(() => BigInt((prev?.totalEvents ?? 0) + 1)),
        // [11]
        publicClient.readContract({ address: ADDRESSES.cosmicEngine, abi: COSMIC_ENGINE_ABI, functionName: "lastEventBlock" }).catch(() => BigInt(prev?.lastEventBlock ?? "0")),
        // [12-19] Burns by source
        ...(ADDRESSES.tokenBurner !== ZERO ? [
          publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [0] }).catch(() => 0n),
          publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [1] }).catch(() => 0n),
          publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [2] }).catch(() => 0n),
          publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [3] }).catch(() => 0n),
          publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [4] }).catch(() => 0n),
          publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [5] }).catch(() => 0n),
          publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [7] }).catch(() => 0n),
          publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [8] }).catch(() => 0n),
        ] : [
          Promise.resolve(0n), Promise.resolve(0n), Promise.resolve(0n),
          Promise.resolve(0n), Promise.resolve(0n), Promise.resolve(0n),
          Promise.resolve(0n), Promise.resolve(0n),
        ]),
        // [20-27] Zone counts (8 zones)
        ...(ADDRESSES.zoneManager !== ZERO
          ? Array.from({ length: 8 }, (_, z) =>
              publicClient.readContract({
                address: ADDRESSES.zoneManager,
                abi: ZONE_MANAGER_ABI,
                functionName: "getZoneAgentCount",
                args: [z],
              }).catch(() => BigInt(prev?.zoneCounts[z] ?? 0))
            )
          : Array.from({ length: 8 }, () => Promise.resolve(0n))
        ),
      ]);

      if (!isMountedRef.current) return;

      const totalMinted = results[0] as bigint;
      const totalBurned = results[1] as bigint;
      const totalSupply = results[2] as bigint;
      const activeCount = results[3] as bigint;
      const nextAgentId = results[4] as bigint;
      const genesisPhase = results[5] as number;
      const currentEra = results[6] as number;
      const eventCooldown = results[7] as bigint;
      const totalHashrate = results[8] as bigint;
      const emission = results[9] as bigint;
      const nextEventId = results[10] as bigint;
      const lastEventBlock = results[11] as bigint;

      const mining = results[12] as bigint;
      const rigP = results[13] as bigint;
      const facU = results[14] as bigint;
      const rigR = results[15] as bigint;
      const shieldP = results[16] as bigint;
      const migrationBurn = results[17] as bigint;
      const marketplaceBurn = results[18] as bigint;
      const sabotageBurn = results[19] as bigint;

      const zoneCounts = (results.slice(20, 28) as bigint[]).map(n => Number(n));

      const ratio = totalMinted > 0n ? Number((totalBurned * 10000n) / totalMinted) / 100 : 0;

      const newData: ChainData = {
        totalMinted: formatEther(totalMinted),
        totalBurned: formatEther(totalBurned),
        circulatingSupply: formatEther(totalSupply),
        burnRatio: ratio,
        burnsBySource: {
          mining: formatEther(mining),
          rigPurchase: formatEther(rigP),
          facilityUpgrade: formatEther(facU),
          rigRepair: formatEther(rigR),
          shieldPurchase: formatEther(shieldP),
          migration: formatEther(migrationBurn),
          marketplace: formatEther(marketplaceBurn),
          sabotage: formatEther(sabotageBurn),
        },
        activeAgentCount: Number(activeCount),
        totalAgents: Math.max(Number(nextAgentId) - 1, 0),
        genesisPhase: Number(genesisPhase),
        currentEra: Number(currentEra),
        eventCooldown: Number(eventCooldown),
        totalHashrate: totalHashrate.toString(),
        emissionPerBlock: formatEther(emission),
        totalEvents: Math.max(Number(nextEventId) - 1, 0),
        lastEventBlock: lastEventBlock.toString(),
        zoneCounts,
      };

      prevRef.current = newData;
      setData(newData);
      setError(null);
      lastSuccessRef.current = Date.now();
    } catch (err: any) {
      // Total failure — keep previous data visible
      console.error("[useChainData] fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastSuccessAt: lastSuccessRef.current };
}
