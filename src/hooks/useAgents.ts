"use client";
import { useState, useEffect, useCallback } from "react";
import { formatEther } from "viem";
import { publicClient, ADDRESSES, AGENT_REGISTRY_ABI, MINING_ENGINE_ABI } from "../lib/contracts";

export interface AgentProfile {
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
}

const POLL_INTERVAL = 15_000; // 15s — less RPC pressure, still responsive
const BATCH_SIZE = 20;

export function useAgents(totalAgents: number) {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [currentBlock, setCurrentBlock] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (
      totalAgents <= 0 ||
      ADDRESSES.agentRegistry === "0x0000000000000000000000000000000000000000"
    ) {
      setAgents([]);
      setLoading(false);
      return;
    }

    const hasMiningEngine =
      ADDRESSES.miningEngine !== "0x0000000000000000000000000000000000000000";

    try {
      // Build ALL calls upfront, then fire them in one big parallel batch
      const agentCalls: Promise<unknown>[] = [];
      const pendingCalls: Promise<unknown>[] = [];

      for (let id = 1; id <= totalAgents; id++) {
        agentCalls.push(
          publicClient.readContract({
            address: ADDRESSES.agentRegistry,
            abi: AGENT_REGISTRY_ABI,
            functionName: "getAgent",
            args: [BigInt(id)],
          }).catch(() => null)
        );
        if (hasMiningEngine) {
          pendingCalls.push(
            publicClient.readContract({
              address: ADDRESSES.miningEngine,
              abi: MINING_ENGINE_ABI,
              functionName: "getPendingRewards",
              args: [BigInt(id)],
            }).catch(() => 0n)
          );
        }
      }

      // Fire block number + all agent reads + all pending reads in parallel
      const [blockNum, agentResults, pendingResults] = await Promise.all([
        publicClient.getBlockNumber().catch(() => 0n),
        Promise.all(agentCalls),
        hasMiningEngine ? Promise.all(pendingCalls) : Promise.resolve([]),
      ]);

      setCurrentBlock(blockNum);

      // Merge new results with previous state — if an RPC call failed for an
      // agent, keep the stale data from the last successful fetch instead of
      // dropping the agent from the list entirely.
      setAgents((prev) => {
        const prevMap = new Map(prev.map((a) => [a.agentId, a]));
        const merged: AgentProfile[] = [];

        for (let i = 0; i < agentResults.length; i++) {
          const raw = agentResults[i];
          const agentIdStr = String(i + 1);

          if (!raw) {
            // RPC call failed — keep previous data if we have it
            const stale = prevMap.get(agentIdStr);
            if (stale) merged.push(stale);
            continue;
          }

          const agent = raw as {
            agentId: bigint;
            moltbookIdHash: `0x${string}`;
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

          const pending = (pendingResults[i] ?? 0n) as bigint;

          merged.push({
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
          });
        }

        return merged;
      });

      setError(null);
    } catch (err: any) {
      // Total failure (e.g. network down) — keep previous agents, just set error
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [totalAgents]);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  return { agents, currentBlock, loading, error, refetch: fetchAgents };
}
