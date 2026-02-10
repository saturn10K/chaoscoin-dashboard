import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://chaoscoin-production.up.railway.app";
const POLL_INTERVAL = 12_000; // 12s

export interface SocialMessage {
  id: string;
  agentId: number;
  agentTitle: string;
  agentEmoji: string;
  archetype: string;
  type: string;
  text: string;
  mood: string;
  zone: number;
  timestamp: number;
  mentionsAgent?: number;
  eventRelated?: boolean;
  replyTo?: string;
}

export interface Alliance {
  id: string;
  members: [number, number];
  name: string;
  strength: number;
  formedAtCycle: number;
  zone: number;
  active: boolean;
  endReason?: string;
  betrayedBy?: number;
}

export interface AllianceEvent {
  type: string;
  allianceId: string;
  agentIds: number[];
  details: string;
  timestamp: number;
}

export interface PersonalityData {
  agentId: number;
  archetype: string;
  emoji: string;
  title: string;
  catchphrase: string;
  traits: Record<string, number>;
  mood: string;
  grudgeCount: number;
  allianceCount: number;
}

export interface SocialStats {
  totalMessages: number;
  totalAlliances: number;
  activeAlliances: number;
  totalBetrayals: number;
  totalPersonalities: number;
  messageTypes: Record<string, number>;
  topPosters: { agentId: number; messageCount: number }[];
  archetypeDistribution: Record<string, number>;
}

export function useSocialFeed(count = 30) {
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/social/feed?count=${count}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [count]);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  return { messages, loading };
}

export function useAlliances() {
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [events, setEvents] = useState<AllianceEvent[]>([]);
  const [stats, setStats] = useState<{ activeCount: number; betrayalCount: number; averageStrength: number }>({
    activeCount: 0, betrayalCount: 0, averageStrength: 0,
  });

  const fetchAlliances = useCallback(async () => {
    try {
      const [allianceRes, eventRes] = await Promise.all([
        fetch(`${API_URL}/api/social/alliances`),
        fetch(`${API_URL}/api/social/alliance-events?count=20`),
      ]);
      if (allianceRes.ok) {
        const data = await allianceRes.json();
        setAlliances(data.alliances || []);
        setStats(data.stats || { activeCount: 0, betrayalCount: 0, averageStrength: 0 });
      }
      if (eventRes.ok) {
        const data = await eventRes.json();
        setEvents(data.events || []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchAlliances();
    const interval = setInterval(fetchAlliances, 20_000);
    return () => clearInterval(interval);
  }, [fetchAlliances]);

  return { alliances, events, stats };
}

export function usePersonalities() {
  const [personalities, setPersonalities] = useState<PersonalityData[]>([]);

  const fetchPersonalities = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/social/personalities`);
      if (res.ok) {
        const data = await res.json();
        setPersonalities(data.personalities || []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchPersonalities();
    const interval = setInterval(fetchPersonalities, 30_000);
    return () => clearInterval(interval);
  }, [fetchPersonalities]);

  return { personalities };
}

export function useSocialStats() {
  const [stats, setStats] = useState<SocialStats | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/social/stats`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 20_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats };
}
