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
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 251449,
    },
  },
});

// Contract addresses (Monad Testnet 10143)
// Env vars can override for local testing; defaults are the live deployed contracts
export const ADDRESSES = {
  chaosToken: (process.env.NEXT_PUBLIC_CHAOS_TOKEN_ADDRESS || "0xf9b40cd538d391e2437b53fb043cb47a61a02bc0") as `0x${string}`,
  tokenBurner: (process.env.NEXT_PUBLIC_TOKEN_BURNER_ADDRESS || "0xa888df07270851300ab34a6b9715e99f468d07a6") as `0x${string}`,
  agentRegistry: (process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS || "0x65a1f64aee5c91b81ca131a6a69facfbdcfdb93c") as `0x${string}`,
  miningEngine: (process.env.NEXT_PUBLIC_MINING_ENGINE_ADDRESS || "0x2c24bdd688d817b7b2aa2036c71b3a31333eff0f") as `0x${string}`,
  eraManager: (process.env.NEXT_PUBLIC_ERA_MANAGER_ADDRESS || "0xe136003be0197a069e285ee0c1667c4f68422fb0") as `0x${string}`,
  zoneManager: (process.env.NEXT_PUBLIC_ZONE_MANAGER_ADDRESS || "0xc9860c102e550c05cbd6d09b16af42cab0ec1ebf") as `0x${string}`,
  cosmicEngine: (process.env.NEXT_PUBLIC_COSMIC_ENGINE_ADDRESS || "0x89df1a167b3fe474131aafd8b847417fea488494") as `0x${string}`,
  rigFactory: (process.env.NEXT_PUBLIC_RIG_FACTORY_ADDRESS || "0xd8d6423be3083fde1b3a3a93be99b09a0e45c38b") as `0x${string}`,
  facilityManager: (process.env.NEXT_PUBLIC_FACILITY_MANAGER_ADDRESS || "0x0abdc66fa331d89b767367c2a6cbf425b6fb93b7") as `0x${string}`,
  shieldManager: (process.env.NEXT_PUBLIC_SHIELD_MANAGER_ADDRESS || "0x73c6be50f0492b1cbc7f1af595028cd894c0c005") as `0x${string}`,
} as const;

// Debug: log loaded addresses on startup
if (typeof window !== "undefined") {
  console.log("[Contracts] RPC:", rpcUrl);
  console.log("[Contracts] ChaosToken:", ADDRESSES.chaosToken);
  console.log("[Contracts] AgentRegistry:", ADDRESSES.agentRegistry);
}

// Public client for read-only chain queries
// Uses multicall batching — viem automatically batches concurrent readContract
// calls into a single multicall3 RPC request
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(rpcUrl),
  batch: {
    multicall: {
      batchSize: 1024,     // up to 1024 calls per multicall
      wait: 50,            // wait 50ms to collect calls into a batch
    },
  },
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
        { name: "condition", type: "uint256" },
        { name: "maxCondition", type: "uint256" },
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

// ─── Write ABIs (for /mine page) ─────────────────────────────────────────────

export const CHAOS_TOKEN_WRITE_ABI = [
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const AGENT_REGISTRY_WRITE_ABI = [
  { inputs: [{ type: "uint256" }], name: "heartbeat", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ type: "address" }], name: "agentByOperator", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
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

export const MINING_ENGINE_WRITE_ABI = [
  { inputs: [{ type: "uint256" }], name: "claimRewards", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ type: "uint256" }], name: "getPendingRewards", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const RIG_FACTORY_WRITE_ABI = [
  { inputs: [{ type: "uint256" }, { type: "uint8" }], name: "purchaseRig", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ type: "uint256" }], name: "repairRig", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ type: "uint256" }], name: "equipRig", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ type: "uint256" }], name: "unequipRig", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ type: "uint256" }], name: "getAgentRigs", outputs: [{ type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ type: "uint8" }], name: "getEffectiveCost", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ type: "uint256" }], name: "calculateEffectiveHashrate", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ type: "uint256" }], name: "getUsedPower", outputs: [{ type: "uint32" }], stateMutability: "view", type: "function" },
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

export const FACILITY_WRITE_ABI = [
  { inputs: [{ type: "uint256" }], name: "upgrade", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ type: "uint256" }], name: "maintainFacility", outputs: [], stateMutability: "nonpayable", type: "function" },
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
        { name: "condition", type: "uint256" },
        { name: "maxCondition", type: "uint256" },
      ],
    }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const SHIELD_WRITE_ABI = [
  { inputs: [{ type: "uint256" }, { type: "uint8" }], name: "purchaseShield", outputs: [], stateMutability: "nonpayable", type: "function" },
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
