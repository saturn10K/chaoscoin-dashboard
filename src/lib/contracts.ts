import { createPublicClient, http, defineChain } from "viem";

// RPC URL from env (supports Anvil local or Monad testnet)
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz";

// Monad Testnet chain definition
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [rpcUrl] },
  },
  blockExplorers: {
    default: { name: "MonadExplorer", url: "https://testnet.monadexplorer.com" },
  },
});

// Contract addresses — set after deployment
// Using env vars with fallback to zeros for development
export const ADDRESSES = {
  chaosToken: (process.env.NEXT_PUBLIC_CHAOS_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  tokenBurner: (process.env.NEXT_PUBLIC_TOKEN_BURNER_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  agentRegistry: (process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  miningEngine: (process.env.NEXT_PUBLIC_MINING_ENGINE_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  eraManager: (process.env.NEXT_PUBLIC_ERA_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  zoneManager: (process.env.NEXT_PUBLIC_ZONE_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  cosmicEngine: (process.env.NEXT_PUBLIC_COSMIC_ENGINE_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  rigFactory: (process.env.NEXT_PUBLIC_RIG_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  facilityManager: (process.env.NEXT_PUBLIC_FACILITY_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  shieldManager: (process.env.NEXT_PUBLIC_SHIELD_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
} as const;

// Public client for read-only chain queries
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(rpcUrl),
});

// ABIs — minimal for dashboard reads
export const CHAOS_TOKEN_ABI = [
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalMinted", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalBurned", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const TOKEN_BURNER_ABI = [
  { inputs: [{ type: "uint8" }], name: "burnsBySource", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "cumulativeBurned", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const AGENT_REGISTRY_ABI = [
  { inputs: [], name: "activeAgentCount", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "nextAgentId", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getGenesisPhase", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ type: "uint256" }],
    name: "getAgent",
    outputs: [{
      type: "tuple",
      components: [
        { name: "agentId", type: "uint256" },
        { name: "moltbookIdHash", type: "bytes32" },
        { name: "operator", type: "address" },
        { name: "hashrate", type: "uint256" },
        { name: "zone", type: "uint8" },
        { name: "cosmicResilience", type: "uint256" },
        { name: "shieldLevel", type: "uint8" },
        { name: "lastHeartbeat", type: "uint256" },
        { name: "registrationBlock", type: "uint256" },
        { name: "pioneerPhase", type: "uint8" },
        { name: "rewardDebt", type: "uint256" },
        { name: "totalMined", type: "uint256" },
        { name: "active", type: "bool" },
      ],
    }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ERA_MANAGER_ABI = [
  { inputs: [], name: "getCurrentEra", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getEventCooldown", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const ZONE_MANAGER_ABI = [
  { inputs: [{ type: "uint8" }], name: "getZoneAgentCount", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const MINING_ENGINE_ABI = [
  { inputs: [], name: "totalEffectiveHashrate", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "calculateAdaptiveEmission", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ type: "uint256" }], name: "getPendingRewards", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const RIG_FACTORY_ABI = [
  {
    inputs: [{ type: "uint256" }],
    name: "getAgentRigs",
    outputs: [{ type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ type: "uint256" }],
    name: "getRig",
    outputs: [{
      type: "tuple",
      components: [
        { name: "tier", type: "uint8" },
        { name: "baseHashrate", type: "uint256" },
        { name: "powerDraw", type: "uint16" },
        { name: "durability", type: "uint256" },
        { name: "maxDurability", type: "uint256" },
        { name: "ownerAgentId", type: "uint256" },
        { name: "active", type: "bool" },
      ],
    }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// NOTE: After redeployment with degradation system, uncomment the condition/maxCondition fields
export const FACILITY_MANAGER_ABI = [
  {
    inputs: [{ type: "uint256" }],
    name: "getFacility",
    outputs: [{
      type: "tuple",
      components: [
        { name: "level", type: "uint8" },
        { name: "slots", type: "uint8" },
        { name: "powerOutput", type: "uint32" },
        { name: "shelterRating", type: "uint8" },
        // { name: "condition", type: "uint256" },    // Enable after redeployment
        // { name: "maxCondition", type: "uint256" },  // Enable after redeployment
      ],
    }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const SHIELD_MANAGER_ABI = [
  {
    inputs: [{ type: "uint256" }],
    name: "getShield",
    outputs: [{
      type: "tuple",
      components: [
        { name: "tier", type: "uint8" },
        { name: "absorption", type: "uint8" },
        { name: "charges", type: "uint8" },
        { name: "active", type: "bool" },
      ],
    }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const CHAOS_TOKEN_BALANCE_ABI = [
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const COSMIC_ENGINE_ABI = [
  { inputs: [], name: "nextEventId", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "lastEventBlock", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ type: "uint256" }],
    name: "getEvent",
    outputs: [{
      type: "tuple",
      components: [
        { name: "eventId", type: "uint256" },
        { name: "eventType", type: "uint8" },
        { name: "severityTier", type: "uint8" },
        { name: "baseDamage", type: "uint256" },
        { name: "originZone", type: "uint8" },
        { name: "affectedZonesMask", type: "uint8" },
        { name: "triggerBlock", type: "uint256" },
        { name: "triggeredBy", type: "address" },
        { name: "processed", type: "bool" },
      ],
    }],
    stateMutability: "view",
    type: "function",
  },
] as const;
