import { useState, useEffect, useRef } from "react";
import type { SabotageEvent } from "@/hooks/useSabotage";
import type { CosmicEvent } from "@/hooks/useCosmicEvents";
import type { AgentProfile } from "@/hooks/useAgents";
import type { WarfareLine3D, ActivityBurst3D, CosmicShockwave3D } from "./types";

export function useZoneEvents(
  sabotageEvents: SabotageEvent[],
  cosmicEvents: CosmicEvent[],
  agents: AgentProfile[],
) {
  const [warfareLines, setWarfareLines] = useState<WarfareLine3D[]>([]);
  const [activitySparks, setActivitySparks] = useState<ActivityBurst3D[]>([]);
  const [cosmicShockwave, setCosmicShockwave] = useState<CosmicShockwave3D | null>(null);
  const lastSabotageIdRef = useRef<string>("");
  const lastCosmicIdRef = useRef<number>(0);
  const initializedRef = useRef(false);

  // Skip initial data to avoid animation spam on load
  useEffect(() => {
    if (sabotageEvents.length > 0) lastSabotageIdRef.current = sabotageEvents[0].id;
    if (cosmicEvents.length > 0) lastCosmicIdRef.current = cosmicEvents[0].eventId;
    const timer = setTimeout(() => { initializedRef.current = true; }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track new sabotage -> warfare lines + activity sparks
  useEffect(() => {
    if (!initializedRef.current || sabotageEvents.length === 0) return;
    if (sabotageEvents[0].id === lastSabotageIdRef.current) return;
    const prevId = lastSabotageIdRef.current;
    lastSabotageIdRef.current = sabotageEvents[0].id;

    const newLines: WarfareLine3D[] = [];
    const newSparks: ActivityBurst3D[] = [];
    for (const evt of sabotageEvents) {
      if (evt.id === prevId) break;
      const attackerAgent = agents.find((a) => a.agentId === String(evt.attackerAgentId));
      const targetAgent = agents.find((a) => a.agentId === String(evt.targetAgentId));
      if (attackerAgent && targetAgent && attackerAgent.zone !== targetAgent.zone) {
        newLines.push({
          id: evt.id,
          fromZone: attackerAgent.zone,
          toZone: targetAgent.zone,
          timestamp: evt.timestamp,
          type: evt.type,
        });
      }
      newSparks.push({
        id: `spark-${evt.id}`,
        zone: evt.zone,
        timestamp: Date.now(),
        color: evt.type === "facility_raid" ? "#FF4444" : evt.type === "rig_jam" ? "#FF9D3D" : "#ECC94B",
      });
    }

    if (newLines.length > 0) {
      setWarfareLines((prev) => [...newLines, ...prev].slice(0, 10));
      setTimeout(() => {
        const ids = new Set(newLines.map((l) => l.id));
        setWarfareLines((prev) => prev.filter((l) => !ids.has(l.id)));
      }, 10000);
    }
    if (newSparks.length > 0) {
      setActivitySparks((prev) => [...newSparks, ...prev].slice(0, 12));
      setTimeout(() => {
        const ids = new Set(newSparks.map((s) => s.id));
        setActivitySparks((prev) => prev.filter((s) => !ids.has(s.id)));
      }, 3000);
    }
  }, [sabotageEvents, agents]);

  // Track cosmic events -> zone shockwave
  useEffect(() => {
    if (!initializedRef.current || cosmicEvents.length === 0) return;
    const latest = cosmicEvents[0];
    if (!latest || latest.eventId <= lastCosmicIdRef.current) return;
    lastCosmicIdRef.current = latest.eventId;

    setCosmicShockwave({ zone: latest.originZone, tier: latest.severityTier, id: latest.eventId });
    setTimeout(() => setCosmicShockwave(null), 4000);
  }, [cosmicEvents]);

  return { warfareLines, activitySparks, cosmicShockwave };
}
