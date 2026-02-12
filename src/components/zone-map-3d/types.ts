import type { Vector3 } from "three";
import type { AgentProfile } from "@/hooks/useAgents";

export interface ZoneMapProps {
  zoneCounts: number[];
  totalAgents: number;
  agents: AgentProfile[];
  onSelectAgent?: (agentId: number) => void;
  pulsingZones?: Set<number>;
  sabotageEvents?: import("@/hooks/useSabotage").SabotageEvent[];
  cosmicEvents?: import("@/hooks/useCosmicEvents").CosmicEvent[];
}

export interface ZoneStats {
  agents: AgentProfile[];
  totalHashrate: number;
  totalMined: number;
  avgHashrate: number;
  shielded: number;
}

export interface ZoneData {
  index: number;
  position: Vector3;
  color: string;
  name: string;
  modifier: string;
  risk: string;
  image: string;
  agentCount: number;
  hashShare: number;
  totalHashrate: number;
  totalMined: number;
  avgHashrate: number;
  shielded: number;
  agents: AgentProfile[];
}

export interface WarfareLine3D {
  id: string;
  fromZone: number;
  toZone: number;
  timestamp: number;
  type: string;
}

export interface ActivityBurst3D {
  id: string;
  zone: number;
  timestamp: number;
  color: string;
}

export interface CosmicShockwave3D {
  zone: number;
  tier: number;
  id: number;
}
