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

const POLL_INTERVAL = 5000;
const MAX_EVENTS = 50;
const BATCH_SIZE = 10;

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
      const results: CosmicEvent[] = [];
      // Fetch most recent events first (reverse order), capped at MAX_EVENTS
      const startId = Math.max(1, totalEvents - MAX_EVENTS + 1);

      for (let batchStart = totalEvents; batchStart >= startId; batchStart -= BATCH_SIZE) {
        const batchEnd = Math.max(batchStart - BATCH_SIZE + 1, startId);
        const batch = [];
        for (let id = batchStart; id >= batchEnd; id--) {
          batch.push(
            publicClient.readContract({
              address: ADDRESSES.cosmicEngine,
              abi: COSMIC_ENGINE_ABI,
              functionName: "getEvent",
              args: [BigInt(id)],
            })
          );
        }

        const batchResults = await Promise.all(batch);

        for (const raw of batchResults) {
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
