"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { formatEther, parseAbiItem } from "viem";
import { publicClient, ADDRESSES } from "../lib/contracts";
import { RIG_NAMES, SHIELD_NAMES, ZONE_NAMES, EVENT_TYPES, FACILITY_NAMES } from "../lib/constants";

export interface ActivityItem {
  id: string;
  type: string;
  agentId: number;
  detail: string;
  blockNumber: bigint;
  txHash: string;
  timestamp: number; // ms since epoch
}

const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;
const POLL_INTERVAL = 10_000;
const MAX_ITEMS = 200;
const LOOKBACK_BLOCKS = 5000n; // ~20-40 min of history on first load
const STORAGE_KEY = "chaoscoin_activity_feed";

// Event signatures — must match contract definitions exactly
const EVENTS = {
  registered: parseAbiItem("event AgentRegistered(uint256 indexed agentId, address indexed operator, bytes32 moltbookIdHash, uint8 zone, uint8 pioneerPhase)"),
  heartbeat: parseAbiItem("event Heartbeat(uint256 indexed agentId, uint256 blockNumber)"),
  rewardsDistributed: parseAbiItem("event RewardsDistributed(uint256 indexed agentId, uint256 amount)"),
  rigPurchased: parseAbiItem("event RigPurchased(uint256 indexed rigId, uint256 indexed agentId, uint8 tier, uint256 cost, uint256 burned)"),
  rigEquipped: parseAbiItem("event RigEquipped(uint256 indexed rigId, uint256 indexed agentId)"),
  rigRepaired: parseAbiItem("event RigRepaired(uint256 indexed rigId, uint256 cost, uint256 burned)"),
  facilityUpgraded: parseAbiItem("event FacilityUpgraded(uint256 indexed agentId, uint8 newLevel, uint256 cost, uint256 burned)"),
  shieldPurchased: parseAbiItem("event ShieldPurchased(uint256 indexed agentId, uint8 tier, uint256 cost, uint256 burned)"),
  eventTriggered: parseAbiItem("event EventTriggered(uint256 indexed eventId, uint8 eventType, uint8 severityTier, uint8 originZone, address triggeredBy)"),
  migrated: parseAbiItem("event AgentMigrated(uint256 indexed agentId, uint8 fromZone, uint8 toZone, uint256 cost, uint256 burned)"),
};

function loadPersistedItems(): ActivityItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as any[];
    return parsed.map((item) => ({
      ...item,
      blockNumber: BigInt(item.blockNumber),
    }));
  } catch {
    return [];
  }
}

function persistItems(items: ActivityItem[]) {
  try {
    const serializable = items.slice(0, MAX_ITEMS).map((item) => ({
      ...item,
      blockNumber: item.blockNumber.toString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {}
}

export function useActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>(() => loadPersistedItems());
  const [loading, setLoading] = useState(true);
  const lastBlockRef = useRef<bigint>(0n);
  const seenTxRef = useRef<Set<string>>(new Set(loadPersistedItems().map((i) => i.id)));

  const fetchLogs = useCallback(async () => {
    try {
      const currentBlock = await publicClient.getBlockNumber();

      // On first call, look back LOOKBACK_BLOCKS; after that, just poll from last seen
      const fromBlock = lastBlockRef.current > 0n
        ? lastBlockRef.current + 1n
        : currentBlock - LOOKBACK_BLOCKS;

      if (fromBlock > currentBlock) {
        setLoading(false);
        return;
      }

      const newItems: ActivityItem[] = [];

      // Fetch logs from each contract in parallel
      const logPromises: Promise<ActivityItem[]>[] = [];

      // AgentRegistry logs
      if (ADDRESSES.agentRegistry !== ZERO) {
        logPromises.push(
          fetchEventLogs(ADDRESSES.agentRegistry, EVENTS.registered, fromBlock, currentBlock, (log) => {
            const args = (log as any).args;
            const zoneName = ZONE_NAMES[Number(args.zone)] || `Zone ${args.zone}`;
            return {
              type: "Register",
              agentId: Number(args.agentId),
              detail: `Registered in ${zoneName} (Pioneer P${args.pioneerPhase})`,
            };
          })
        );
        logPromises.push(
          fetchEventLogs(ADDRESSES.agentRegistry, EVENTS.heartbeat, fromBlock, currentBlock, (log) => ({
            type: "Heartbeat",
            agentId: Number((log as any).args.agentId),
            detail: "Sent heartbeat",
          }))
        );
      }

      // MiningEngine logs — RewardsDistributed (auto-distributed on heartbeat)
      if (ADDRESSES.miningEngine !== ZERO) {
        logPromises.push(
          fetchEventLogs(ADDRESSES.miningEngine, EVENTS.rewardsDistributed, fromBlock, currentBlock, (log) => {
            const args = (log as any).args;
            const amount = formatEther(args.amount);
            return {
              type: "Reward",
              agentId: Number(args.agentId),
              detail: `Received ${amount} CHAOS`,
            };
          })
        );
      }

      // RigFactory logs
      if (ADDRESSES.rigFactory !== ZERO) {
        logPromises.push(
          fetchEventLogs(ADDRESSES.rigFactory, EVENTS.rigPurchased, fromBlock, currentBlock, (log) => {
            const args = (log as any).args;
            const rigName = RIG_NAMES[Number(args.tier)] || `T${args.tier} Rig`;
            return {
              type: "Rig Buy",
              agentId: Number(args.agentId),
              detail: `Purchased ${rigName} (${formatEther(args.cost)} CHAOS)`,
            };
          })
        );
        logPromises.push(
          fetchEventLogs(ADDRESSES.rigFactory, EVENTS.rigEquipped, fromBlock, currentBlock, (log) => ({
            type: "Rig Equip",
            agentId: Number((log as any).args.agentId),
            detail: "Equipped a new rig",
          }))
        );
      }

      // FacilityManager logs
      if (ADDRESSES.facilityManager !== ZERO) {
        logPromises.push(
          fetchEventLogs(ADDRESSES.facilityManager, EVENTS.facilityUpgraded, fromBlock, currentBlock, (log) => {
            const args = (log as any).args;
            const lvl = Number(args.newLevel);
            const facName = FACILITY_NAMES[lvl - 1] || `Level ${lvl}`;
            return {
              type: "Facility",
              agentId: Number(args.agentId),
              detail: `Upgraded facility to ${facName} (${formatEther(args.cost)} CHAOS)`,
            };
          })
        );
      }

      // ShieldManager logs
      if (ADDRESSES.shieldManager !== ZERO) {
        logPromises.push(
          fetchEventLogs(ADDRESSES.shieldManager, EVENTS.shieldPurchased, fromBlock, currentBlock, (log) => {
            const args = (log as any).args;
            const shieldName = SHIELD_NAMES[Number(args.tier)] || `T${args.tier} Shield`;
            return {
              type: "Shield",
              agentId: Number(args.agentId),
              detail: `Purchased ${shieldName} (${formatEther(args.cost)} CHAOS)`,
            };
          })
        );
      }

      // CosmicEngine logs
      if (ADDRESSES.cosmicEngine !== ZERO) {
        logPromises.push(
          fetchEventLogs(ADDRESSES.cosmicEngine, EVENTS.eventTriggered, fromBlock, currentBlock, (log) => {
            const args = (log as any).args;
            const evtType = EVENT_TYPES[Number(args.eventType)];
            const evtName = evtType?.name || `Type ${args.eventType}`;
            const zoneName = ZONE_NAMES[Number(args.originZone)] || `Zone ${args.originZone}`;
            return {
              type: "Event",
              agentId: 0,
              detail: `${evtName} struck ${zoneName}`,
            };
          })
        );
      }

      // ZoneManager migration logs
      if (ADDRESSES.zoneManager !== ZERO) {
        logPromises.push(
          fetchEventLogs(ADDRESSES.zoneManager, EVENTS.migrated, fromBlock, currentBlock, (log) => {
            const args = (log as any).args;
            const fromName = ZONE_NAMES[Number(args.fromZone)] || `Zone ${args.fromZone}`;
            const toName = ZONE_NAMES[Number(args.toZone)] || `Zone ${args.toZone}`;
            return {
              type: "Migrate",
              agentId: Number(args.agentId),
              detail: `Migrated from ${fromName} to ${toName} (${formatEther(args.cost)} CHAOS)`,
            };
          })
        );
      }

      const results = await Promise.all(logPromises);
      for (const batch of results) {
        for (const item of batch) {
          if (!seenTxRef.current.has(item.id)) {
            seenTxRef.current.add(item.id);
            newItems.push(item);
          }
        }
      }

      if (newItems.length > 0) {
        setItems((prev) => {
          const combined = [...newItems, ...prev];
          combined.sort((a, b) => Number(b.blockNumber - a.blockNumber));
          const trimmed = combined.slice(0, MAX_ITEMS);
          persistItems(trimmed);
          return trimmed;
        });
      }

      lastBlockRef.current = currentBlock;
    } catch {
      // Silent fail on log fetching — will retry next poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  return { items, loading };
}

async function fetchEventLogs(
  address: `0x${string}`,
  event: any,
  fromBlock: bigint,
  toBlock: bigint,
  parse: (log: any) => { type: string; agentId: number; detail: string }
): Promise<ActivityItem[]> {
  try {
    const logs = await publicClient.getLogs({
      address,
      event,
      fromBlock,
      toBlock,
    });

    return logs.map((log) => {
      const parsed = parse(log);
      return {
        id: `${log.transactionHash}-${log.logIndex}`,
        type: parsed.type,
        agentId: parsed.agentId,
        detail: parsed.detail,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: Date.now(),
      };
    });
  } catch {
    return [];
  }
}
