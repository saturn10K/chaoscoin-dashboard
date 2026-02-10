"use client";
import { useState, useEffect, useCallback } from "react";
import { publicClient, ADDRESSES, COSMIC_ENGINE_ABI } from "../lib/contracts";

export interface CosmicEvent {
  eventId: number;
  eventType: number;
  severityTier: number;
  originZone: number;
  affectedZonesMask: number;
  triggerBlock: string;
  processed: boolean;
}

const POLL_INTERVAL = 15_000; // 15s — multicall batching makes each poll fast
const MAX_EVENTS = 50;

export function useCosmicEvents(totalEvents: number) {
  const [events, setEvents] = useState<CosmicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (
      totalEvents <= 0 ||
      ADDRESSES.cosmicEngine === "0x0000000000000000000000000000000000000000"
    ) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      // Fire ALL event reads at once — multicall batching on publicClient
      // will combine them into a single RPC request
      const startId = Math.max(1, totalEvents - MAX_EVENTS + 1);
      const calls: Promise<unknown>[] = [];
      for (let id = totalEvents; id >= startId; id--) {
        calls.push(
          publicClient.readContract({
            address: ADDRESSES.cosmicEngine,
            abi: COSMIC_ENGINE_ABI,
            functionName: "getEvent",
            args: [BigInt(id)],
          }).catch(() => null)
        );
      }

      const rawResults = await Promise.all(calls);

      const results: CosmicEvent[] = [];
      for (const raw of rawResults) {
        if (!raw) continue;
        const evt = raw as {
          eventId: bigint;
          eventType: number;
          severityTier: number;
          baseDamage: bigint;
          originZone: number;
          affectedZonesMask: number;
          triggerBlock: bigint;
          triggeredBy: `0x${string}`;
          processed: boolean;
        };

        results.push({
          eventId: Number(evt.eventId),
          eventType: Number(evt.eventType),
          severityTier: Number(evt.severityTier),
          originZone: Number(evt.originZone),
          affectedZonesMask: Number(evt.affectedZonesMask),
          triggerBlock: evt.triggerBlock.toString(),
          processed: evt.processed,
        });
      }

      setEvents(results);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [totalEvents]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
