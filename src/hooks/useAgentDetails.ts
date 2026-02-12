"use client";
import { useState, useEffect, useCallback } from "react";
import { formatEther } from "viem";
import {
  publicClient,
  ADDRESSES,
  AGENT_REGISTRY_ABI,
  MINING_ENGINE_ABI,
  RIG_FACTORY_ABI,
  FACILITY_MANAGER_ABI,
  SHIELD_MANAGER_ABI,
  CHAOS_TOKEN_BALANCE_ABI,
} from "../lib/contracts";

export interface RigInfo {
  rigId: number;
  tier: number;
  baseHashrate: string;
  powerDraw: number;
  durability: number;
  maxDurability: number;
  active: boolean;
}

export interface FacilityInfo {
  level: number;
  slots: number;
  powerOutput: number;
  shelterRating: number;
  condition: number;
  maxCondition: number;
}

export interface ShieldInfo {
  tier: number;
  absorption: number;
  charges: number;
  active: boolean;
}

export interface AgentDetails {
  agentId: string;
  operator: string;
  hashrate: string;
  zone: number;
  cosmicResilience: string;
  shieldLevel: number;
  lastHeartbeat: string;
  registrationBlock: string;
  pioneerPhase: number;
  totalMined: string;
  pendingRewards: string;
  active: boolean;
  walletBalance: string;
  rigs: RigInfo[];
  facility: FacilityInfo;
  shield: ShieldInfo;
}

const POLL_INTERVAL = 5000;

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export function useAgentDetails(agentId: number | null) {
  const [details, setDetails] = useState<AgentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!agentId || agentId <= 0 || ADDRESSES.agentRegistry === ZERO) {
      setDetails(null);
      return;
    }

    setLoading(true);
    try {
      // Fetch agent struct
      const agent = (await publicClient.readContract({
        address: ADDRESSES.agentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: "getAgent",
        args: [BigInt(agentId)],
      })) as {
        agentId: bigint;
        operator: `0x${string}`;
        hashrate: bigint;
        zone: number;
        cosmicResilience: bigint;
        shieldLevel: number;
        lastHeartbeat: bigint;
        registrationBlock: bigint;
        pioneerPhase: number;
        rewardDebt: bigint;
        totalMined: bigint;
        active: boolean;
      };

      // Fetch pending rewards
      let pending = 0n;
      if (ADDRESSES.miningEngine !== ZERO) {
        try {
          pending = (await publicClient.readContract({
            address: ADDRESSES.miningEngine,
            abi: MINING_ENGINE_ABI,
            functionName: "getPendingRewards",
            args: [BigInt(agentId)],
          })) as bigint;
        } catch { /* no-op */ }
      }

      // Fetch wallet balance
      let walletBal = 0n;
      if (ADDRESSES.chaosToken !== ZERO) {
        try {
          walletBal = (await publicClient.readContract({
            address: ADDRESSES.chaosToken,
            abi: CHAOS_TOKEN_BALANCE_ABI,
            functionName: "balanceOf",
            args: [agent.operator],
          })) as bigint;
        } catch { /* no-op */ }
      }

      // Fetch rigs — batch in groups of 5 to avoid RPC rate limits
      let rigs: RigInfo[] = [];
      if (ADDRESSES.rigFactory !== ZERO) {
        try {
          const rigIds = (await publicClient.readContract({
            address: ADDRESSES.rigFactory,
            abi: RIG_FACTORY_ABI,
            functionName: "getAgentRigs",
            args: [BigInt(agentId)],
          })) as bigint[];

          const validIds = rigIds.filter((id) => id > 0n);

          // Fetch in small batches with delays to avoid Monad RPC rate limits (15 req/s)
          const BATCH_SIZE = 3;
          const BATCH_DELAY_MS = 250;
          for (let i = 0; i < validIds.length; i += BATCH_SIZE) {
            const batch = validIds.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.allSettled(
              batch.map(async (id) => {
                const r = (await publicClient.readContract({
                  address: ADDRESSES.rigFactory,
                  abi: RIG_FACTORY_ABI,
                  functionName: "getRig",
                  args: [id],
                })) as {
                  tier: number;
                  baseHashrate: bigint;
                  powerDraw: number;
                  durability: bigint;
                  maxDurability: bigint;
                  ownerAgentId: bigint;
                  active: boolean;
                };
                return {
                  rigId: Number(id),
                  tier: Number(r.tier),
                  baseHashrate: r.baseHashrate.toString(),
                  powerDraw: Number(r.powerDraw),
                  durability: Number(r.durability),
                  maxDurability: Number(r.maxDurability),
                  active: r.active,
                };
              })
            );
            for (const result of batchResults) {
              if (result.status === "fulfilled") rigs.push(result.value);
            }
            // Delay between batches to stay within RPC rate limits
            if (i + BATCH_SIZE < validIds.length) {
              await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
            }
          }
        } catch { /* getAgentRigs call itself failed */ }
      }

      // Fetch facility
      let facility: FacilityInfo = { level: 1, slots: 2, powerOutput: 500, shelterRating: 5, condition: 0, maxCondition: 0 };
      if (ADDRESSES.facilityManager !== ZERO) {
        try {
          const f = (await publicClient.readContract({
            address: ADDRESSES.facilityManager,
            abi: FACILITY_MANAGER_ABI,
            functionName: "getFacility",
            args: [BigInt(agentId)],
          })) as any;
          facility = {
            level: Number(f.level),
            slots: Number(f.slots),
            powerOutput: Number(f.powerOutput),
            shelterRating: Number(f.shelterRating),
            // condition/maxCondition available after degradation system deployment
            condition: f.condition ? Number(f.condition) : 0,
            maxCondition: f.maxCondition ? Number(f.maxCondition) : 0,
          };
        } catch { /* no-op */ }
      }

      // Fetch shield
      let shield: ShieldInfo = { tier: 0, absorption: 0, charges: 0, active: false };
      if (ADDRESSES.shieldManager !== ZERO) {
        try {
          const s = (await publicClient.readContract({
            address: ADDRESSES.shieldManager,
            abi: SHIELD_MANAGER_ABI,
            functionName: "getShield",
            args: [BigInt(agentId)],
          })) as { tier: number; absorption: number; charges: number; active: boolean };
          shield = {
            tier: Number(s.tier),
            absorption: Number(s.absorption),
            charges: Number(s.charges),
            active: s.active,
          };
        } catch { /* no-op */ }
      }

      setDetails({
        agentId: agent.agentId.toString(),
        operator: agent.operator,
        hashrate: agent.hashrate.toString(),
        zone: Number(agent.zone),
        cosmicResilience: agent.cosmicResilience.toString(),
        shieldLevel: Number(agent.shieldLevel),
        lastHeartbeat: agent.lastHeartbeat.toString(),
        registrationBlock: agent.registrationBlock.toString(),
        pioneerPhase: Number(agent.pioneerPhase),
        totalMined: formatEther(agent.totalMined + pending),
        pendingRewards: formatEther(pending),
        active: agent.active,
        walletBalance: formatEther(walletBal),
        rigs,
        facility,
        shield,
      });

      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(fetchDetails, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchDetails]);

  return { details, loading, error };
}
