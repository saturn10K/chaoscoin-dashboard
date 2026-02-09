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
  burnsBySource: { mining: string; rigPurchase: string; facilityUpgrade: string; rigRepair: string; shieldPurchase: string; migration: string };
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

const POLL_INTERVAL = 15_000; // 15s — reduces RPC pressure
const ZERO = "0x0000000000000000000000000000000000000000" as const;

// Sentinel value to distinguish "RPC failed" from "RPC returned 0"
const FAILED = Symbol("failed");
type MaybeResult<T> = T | typeof FAILED;

async function safeRead<T>(call: Promise<T>): Promise<MaybeResult<T>> {
  try {
    return await call;
  } catch {
    return FAILED;
  }
}

function val<T>(result: MaybeResult<T>, prev: T): T {
  return result === FAILED ? prev : result;
}

export function useChainData() {
  const [data, setData] = useState<ChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevRef = useRef<ChainData | null>(null);

  const fetchData = useCallback(async () => {
    // Skip if addresses are zeros (not deployed)
    if (ADDRESSES.chaosToken === ZERO) {
      setData(null);
      setLoading(false);
      return;
    }

    const prev = prevRef.current;

    try {
      // Fire ALL reads in one massive parallel batch to minimize round-trips
      const [
        totalMintedR, totalBurnedR, totalSupplyR,
        activeCountR, nextAgentIdR, genesisPhaseR,
        currentEraR, eventCooldownR,
        totalHashrateR, emissionR,
        nextEventIdR, lastEventBlockR,
        miningB, rigPB, facUB, rigRB, shieldPB, migrationBB,
        ...zoneCountsR
      ] = await Promise.all([
        // Supply
        safeRead(publicClient.readContract({ address: ADDRESSES.chaosToken, abi: CHAOS_TOKEN_ABI, functionName: "totalMinted" })),
        safeRead(publicClient.readContract({ address: ADDRESSES.chaosToken, abi: CHAOS_TOKEN_ABI, functionName: "totalBurned" })),
        safeRead(publicClient.readContract({ address: ADDRESSES.chaosToken, abi: CHAOS_TOKEN_ABI, functionName: "totalSupply" })),
        // Agents
        safeRead(publicClient.readContract({ address: ADDRESSES.agentRegistry, abi: AGENT_REGISTRY_ABI, functionName: "activeAgentCount" })),
        safeRead(publicClient.readContract({ address: ADDRESSES.agentRegistry, abi: AGENT_REGISTRY_ABI, functionName: "nextAgentId" })),
        safeRead(publicClient.readContract({ address: ADDRESSES.agentRegistry, abi: AGENT_REGISTRY_ABI, functionName: "getGenesisPhase" })),
        // Era
        safeRead(publicClient.readContract({ address: ADDRESSES.eraManager, abi: ERA_MANAGER_ABI, functionName: "getCurrentEra" })),
        safeRead(publicClient.readContract({ address: ADDRESSES.eraManager, abi: ERA_MANAGER_ABI, functionName: "getEventCooldown" })),
        // Mining
        safeRead(publicClient.readContract({ address: ADDRESSES.miningEngine, abi: MINING_ENGINE_ABI, functionName: "totalEffectiveHashrate" })),
        safeRead(publicClient.readContract({ address: ADDRESSES.miningEngine, abi: MINING_ENGINE_ABI, functionName: "calculateAdaptiveEmission" })),
        // Events
        safeRead(publicClient.readContract({ address: ADDRESSES.cosmicEngine, abi: COSMIC_ENGINE_ABI, functionName: "nextEventId" })),
        safeRead(publicClient.readContract({ address: ADDRESSES.cosmicEngine, abi: COSMIC_ENGINE_ABI, functionName: "lastEventBlock" })),
        // Burns by source
        ...(ADDRESSES.tokenBurner !== ZERO ? [
          safeRead(publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [0] })),
          safeRead(publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [1] })),
          safeRead(publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [2] })),
          safeRead(publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [3] })),
          safeRead(publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [4] })),
          safeRead(publicClient.readContract({ address: ADDRESSES.tokenBurner, abi: TOKEN_BURNER_ABI, functionName: "burnsBySource", args: [5] })),
        ] : [
          Promise.resolve(0n), Promise.resolve(0n), Promise.resolve(0n),
          Promise.resolve(0n), Promise.resolve(0n), Promise.resolve(0n),
        ]),
        // Zone counts (8 zones)
        ...(ADDRESSES.zoneManager !== ZERO
          ? Array.from({ length: 8 }, (_, z) =>
              safeRead(publicClient.readContract({
                address: ADDRESSES.zoneManager,
                abi: ZONE_MANAGER_ABI,
                functionName: "getZoneAgentCount",
                args: [z],
              }))
            )
          : Array.from({ length: 8 }, () => Promise.resolve(0n))
        ),
      ]);

      // Resolve each value — use previous data as fallback when RPC failed
      const totalMinted = val(totalMintedR as MaybeResult<bigint>, prev ? BigInt(Math.round(parseFloat(prev.totalMinted) * 1e18)) : 0n);
      const totalBurned = val(totalBurnedR as MaybeResult<bigint>, prev ? BigInt(Math.round(parseFloat(prev.totalBurned) * 1e18)) : 0n);
      const totalSupply = val(totalSupplyR as MaybeResult<bigint>, prev ? BigInt(Math.round(parseFloat(prev.circulatingSupply) * 1e18)) : 0n);
      const activeCount = val(activeCountR as MaybeResult<bigint>, BigInt(prev?.activeAgentCount ?? 0));
      const nextAgentId = val(nextAgentIdR as MaybeResult<bigint>, BigInt((prev?.totalAgents ?? 0) + 1));
      const genesisPhase = val(genesisPhaseR as MaybeResult<number>, prev?.genesisPhase ?? 0);
      const currentEra = val(currentEraR as MaybeResult<number>, prev?.currentEra ?? 1);
      const eventCooldown = val(eventCooldownR as MaybeResult<bigint>, BigInt(prev?.eventCooldown ?? 75000));
      const totalHashrate = val(totalHashrateR as MaybeResult<bigint>, BigInt(prev?.totalHashrate ?? "0"));
      const emission = val(emissionR as MaybeResult<bigint>, prev ? BigInt(Math.round(parseFloat(prev.emissionPerBlock) * 1e18)) : 0n);
      const nextEventId = val(nextEventIdR as MaybeResult<bigint>, BigInt((prev?.totalEvents ?? 0) + 1));
      const lastEventBlock = val(lastEventBlockR as MaybeResult<bigint>, BigInt(prev?.lastEventBlock ?? "0"));
      const mining = val(miningB as MaybeResult<bigint>, prev ? BigInt(Math.round(parseFloat(prev.burnsBySource.mining) * 1e18)) : 0n);
      const rigP = val(rigPB as MaybeResult<bigint>, prev ? BigInt(Math.round(parseFloat(prev.burnsBySource.rigPurchase) * 1e18)) : 0n);
      const facU = val(facUB as MaybeResult<bigint>, prev ? BigInt(Math.round(parseFloat(prev.burnsBySource.facilityUpgrade) * 1e18)) : 0n);
      const rigR = val(rigRB as MaybeResult<bigint>, prev ? BigInt(Math.round(parseFloat(prev.burnsBySource.rigRepair) * 1e18)) : 0n);
      const shieldP = val(shieldPB as MaybeResult<bigint>, prev ? BigInt(Math.round(parseFloat(prev.burnsBySource.shieldPurchase) * 1e18)) : 0n);
      const migrationBurn = val(migrationBB as MaybeResult<bigint>, prev ? BigInt(Math.round(parseFloat(prev.burnsBySource.migration) * 1e18)) : 0n);

      const zoneCounts = (zoneCountsR as MaybeResult<bigint>[]).map((r, i) =>
        Number(val(r, BigInt(prev?.zoneCounts[i] ?? 0)))
      );

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
    } catch (err: any) {
      // Total failure — keep previous data visible
      console.error("[useChainData] fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
