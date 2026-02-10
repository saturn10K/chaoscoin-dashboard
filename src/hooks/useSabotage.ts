import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://chaoscoin-production.up.railway.app";

export interface SabotageEvent {
  id: string;
  type: "facility_raid" | "rig_jam" | "intel_gathering";
  attackerAgentId: number;
  attackerTitle: string;
  targetAgentId: number;
  targetTitle: string;
  cost: string;
  burned: string;
  damage: number;
  shieldReduction: number;
  zone: number;
  timestamp: number;
  narrative?: string;
}

export interface NegotiationEvent {
  id: string;
  type: string;
  proposerAgentId: number;
  proposerTitle: string;
  targetAgentId: number;
  targetTitle: string;
  terms: string;
  outcome: "accepted" | "rejected" | "expired";
  response?: string;
  timestamp: number;
}

export interface SabotageStats {
  totalAttacks: number;
  totalCost: string;
  totalBurned: string;
  attacksByType: Record<string, number>;
  topAttackers: { agentId: number; attackCount: number }[];
  topTargets: { agentId: number; timesTargeted: number }[];
  negotiations: {
    total: number;
    accepted: number;
    rejected: number;
    acceptRate: number;
  };
}

export function useSabotage() {
  const [events, setEvents] = useState<SabotageEvent[]>([]);
  const [negotiations, setNegotiations] = useState<NegotiationEvent[]>([]);
  const [stats, setStats] = useState<SabotageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [eventsRes, negotiationsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/sabotage/events?count=20`),
        fetch(`${API_URL}/api/sabotage/negotiations?count=10`),
        fetch(`${API_URL}/api/sabotage/stats`),
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
      if (negotiationsRes.ok) {
        const data = await negotiationsRes.json();
        setNegotiations(data.negotiations || []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { events, negotiations, stats, loading };
}
