"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient, useSwitchChain, useChainId } from "wagmi";
import { formatEther, parseEther } from "viem";
import {
  monadTestnet,
  ADDRESSES,
  CHAOS_TOKEN_WRITE_ABI,
  AGENT_REGISTRY_WRITE_ABI,
  MINING_ENGINE_WRITE_ABI,
  RIG_FACTORY_WRITE_ABI,
  FACILITY_WRITE_ABI,
  SHIELD_WRITE_ABI,
} from "../lib/contracts";
import {
  ZONE_NAMES,
  ZONE_COLORS,
  RIG_NAMES,
  RIG_TIER_COLORS,
  FACILITY_NAMES,
  SHIELD_NAMES,
} from "../lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgentData {
  agentId: number;
  operator: string;
  hashrate: bigint;
  zone: number;
  cosmicResilience: bigint;
  shieldLevel: number;
  lastHeartbeat: bigint;
  totalMined: bigint;
  active: boolean;
  pioneerPhase: number;
}

interface FacilityData {
  level: number;
  slots: number;
  powerOutput: number;
  shelterRating: number;
}

interface ShieldData {
  tier: number;
  absorption: number;
  charges: number;
  active: boolean;
}

type LogEntry = { ts: number; msg: string; type: "info" | "success" | "error" | "warn" };

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

const HEARTBEAT_INTERVAL = 30_000; // 30s between heartbeats
const CLAIM_INTERVAL = 120_000;    // 2min between claims

// ─── Component ───────────────────────────────────────────────────────────────

export default function MiningPanel() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const wrongChain = isConnected && chainId !== monadTestnet.id;

  // State
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [facility, setFacility] = useState<FacilityData | null>(null);
  const [shield, setShield] = useState<ShieldData | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [pendingRewards, setPendingRewards] = useState<bigint>(0n);
  const [rigCount, setRigCount] = useState(0);
  const [effectiveHashrate, setEffectiveHashrate] = useState<bigint>(0n);
  const [usedPower, setUsedPower] = useState(0);

  const [mining, setMining] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [txPending, setTxPending] = useState<string | null>(null);

  const miningRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const log = useCallback((msg: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [...prev.slice(-50), { ts: Date.now(), msg, type }]);
  }, []);

  // ─── Lookup agent by connected wallet ────────────────────────────────────

  const lookupAgent = useCallback(async () => {
    if (!address || !publicClient || ADDRESSES.agentRegistry === ZERO_ADDR) return;

    try {
      setLoading(true);
      const id = await publicClient.readContract({
        address: ADDRESSES.agentRegistry,
        abi: AGENT_REGISTRY_WRITE_ABI,
        functionName: "agentByOperator",
        args: [address],
      });

      const numId = Number(id);
      if (numId === 0) {
        setAgentId(null);
        setAgent(null);
        log("No agent found for this wallet. Register via the API first.", "warn");
        return;
      }

      setAgentId(numId);
      log(`Found Agent #${numId}`, "success");
      await refreshAgentData(numId);
    } catch (err: any) {
      log(`Lookup failed: ${err.message?.slice(0, 80)}`, "error");
    } finally {
      setLoading(false);
    }
  }, [address, publicClient, log]);

  // ─── Refresh all agent data ──────────────────────────────────────────────

  const refreshAgentData = useCallback(async (id?: number) => {
    const aid = id ?? agentId;
    if (!aid || !publicClient || !address) return;

    try {
      const [agentRaw, facilityRaw, shieldRaw, bal, pending, rigs, hashrate, power] = await Promise.all([
        publicClient.readContract({ address: ADDRESSES.agentRegistry, abi: AGENT_REGISTRY_WRITE_ABI, functionName: "getAgent", args: [BigInt(aid)] }),
        publicClient.readContract({ address: ADDRESSES.facilityManager, abi: FACILITY_WRITE_ABI, functionName: "getFacility", args: [BigInt(aid)] }).catch(() => null),
        publicClient.readContract({ address: ADDRESSES.shieldManager, abi: SHIELD_WRITE_ABI, functionName: "getShield", args: [BigInt(aid)] }).catch(() => null),
        publicClient.readContract({ address: ADDRESSES.chaosToken, abi: CHAOS_TOKEN_WRITE_ABI, functionName: "balanceOf", args: [address] }),
        publicClient.readContract({ address: ADDRESSES.miningEngine, abi: MINING_ENGINE_WRITE_ABI, functionName: "getPendingRewards", args: [BigInt(aid)] }).catch(() => 0n),
        publicClient.readContract({ address: ADDRESSES.rigFactory, abi: RIG_FACTORY_WRITE_ABI, functionName: "getAgentRigs", args: [BigInt(aid)] }).catch(() => []),
        publicClient.readContract({ address: ADDRESSES.rigFactory, abi: RIG_FACTORY_WRITE_ABI, functionName: "calculateEffectiveHashrate", args: [BigInt(aid)] }).catch(() => 0n),
        publicClient.readContract({ address: ADDRESSES.rigFactory, abi: RIG_FACTORY_WRITE_ABI, functionName: "getUsedPower", args: [BigInt(aid)] }).catch(() => 0),
      ]);

      const a = agentRaw as any;
      setAgent({
        agentId: Number(a.agentId),
        operator: a.operator,
        hashrate: a.hashrate,
        zone: a.zone,
        cosmicResilience: a.cosmicResilience,
        shieldLevel: a.shieldLevel,
        lastHeartbeat: a.lastHeartbeat,
        totalMined: a.totalMined,
        active: a.active,
        pioneerPhase: a.pioneerPhase,
      });

      if (facilityRaw) {
        const f = facilityRaw as any;
        setFacility({ level: f.level, slots: f.slots, powerOutput: Number(f.powerOutput), shelterRating: f.shelterRating });
      }
      if (shieldRaw) {
        const s = shieldRaw as any;
        setShield({ tier: s.tier, absorption: s.absorption, charges: s.charges, active: s.active });
      }

      setBalance(bal as bigint);
      setPendingRewards(pending as bigint);
      setRigCount((rigs as bigint[]).length);
      setEffectiveHashrate(hashrate as bigint);
      setUsedPower(Number(power));
    } catch (err: any) {
      log(`Data refresh failed: ${err.message?.slice(0, 60)}`, "error");
    }
  }, [agentId, publicClient, address, log]);

  // Lookup on connect
  useEffect(() => {
    if (isConnected && address) {
      lookupAgent();
    } else {
      setAgentId(null);
      setAgent(null);
    }
  }, [isConnected, address, lookupAgent]);

  // ─── Mining loop ─────────────────────────────────────────────────────────

  const doHeartbeat = useCallback(async () => {
    if (!walletClient || !agentId || !publicClient) return false;
    try {
      setTxPending("heartbeat");
      const hash = await walletClient.writeContract({
        address: ADDRESSES.agentRegistry,
        abi: AGENT_REGISTRY_WRITE_ABI,
        functionName: "heartbeat",
        args: [BigInt(agentId)],
      });
      log(`Heartbeat sent: ${hash.slice(0, 10)}...`, "info");
      await publicClient.waitForTransactionReceipt({ hash });
      log("Heartbeat confirmed", "success");
      return true;
    } catch (err: any) {
      log(`Heartbeat failed: ${err.message?.slice(0, 60)}`, "error");
      return false;
    } finally {
      setTxPending(null);
    }
  }, [walletClient, agentId, publicClient, log]);

  const doClaim = useCallback(async () => {
    if (!walletClient || !agentId || !publicClient) return false;
    try {
      setTxPending("claim");
      const hash = await walletClient.writeContract({
        address: ADDRESSES.miningEngine,
        abi: MINING_ENGINE_WRITE_ABI,
        functionName: "claimRewards",
        args: [BigInt(agentId)],
      });
      log(`Claiming rewards: ${hash.slice(0, 10)}...`, "info");
      await publicClient.waitForTransactionReceipt({ hash });
      log("Rewards claimed!", "success");
      return true;
    } catch (err: any) {
      log(`Claim failed: ${err.message?.slice(0, 60)}`, "error");
      return false;
    } finally {
      setTxPending(null);
    }
  }, [walletClient, agentId, publicClient, log]);

  const startMining = useCallback(async () => {
    if (!walletClient || !agentId) return;
    setMining(true);
    miningRef.current = true;
    log("Mining started — heartbeats every 30s, claims every 2m", "success");

    let claimCounter = 0;

    const loop = async () => {
      while (miningRef.current) {
        // Heartbeat
        await doHeartbeat();
        if (!miningRef.current) break;

        claimCounter++;
        // Claim every 4 heartbeats (30s * 4 = 2min)
        if (claimCounter >= 4) {
          await doClaim();
          claimCounter = 0;
        }

        // Refresh data
        await refreshAgentData();
        if (!miningRef.current) break;

        // Wait 30 seconds
        await new Promise((r) => setTimeout(r, HEARTBEAT_INTERVAL));
      }
    };

    loop();
  }, [walletClient, agentId, doHeartbeat, doClaim, refreshAgentData, log]);

  const stopMining = useCallback(() => {
    miningRef.current = false;
    setMining(false);
    log("Mining stopped", "warn");
  }, [log]);

  // ─── Manual actions ──────────────────────────────────────────────────────

  const buyRig = useCallback(async (tier: number) => {
    if (!walletClient || !agentId || !publicClient) return;
    try {
      setTxPending(`rig-${tier}`);
      // Get cost
      const cost = await publicClient.readContract({
        address: ADDRESSES.rigFactory,
        abi: RIG_FACTORY_WRITE_ABI,
        functionName: "getEffectiveCost",
        args: [tier],
      }) as bigint;

      // Approve
      log(`Approving ${formatEther(cost)} CHAOS for ${RIG_NAMES[tier]}...`, "info");
      let hash = await walletClient.writeContract({
        address: ADDRESSES.chaosToken,
        abi: CHAOS_TOKEN_WRITE_ABI,
        functionName: "approve",
        args: [ADDRESSES.rigFactory, cost],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      // Purchase
      log(`Purchasing ${RIG_NAMES[tier]}...`, "info");
      hash = await walletClient.writeContract({
        address: ADDRESSES.rigFactory,
        abi: RIG_FACTORY_WRITE_ABI,
        functionName: "purchaseRig",
        args: [BigInt(agentId), tier],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      log(`${RIG_NAMES[tier]} purchased!`, "success");
      await refreshAgentData();
    } catch (err: any) {
      log(`Rig purchase failed: ${err.message?.slice(0, 60)}`, "error");
    } finally {
      setTxPending(null);
    }
  }, [walletClient, agentId, publicClient, log, refreshAgentData]);

  const upgradeFacility = useCallback(async () => {
    if (!walletClient || !agentId || !publicClient) return;
    try {
      setTxPending("facility");
      // Approve a large amount for facility upgrade
      const approveAmt = parseEther("100000");
      let hash = await walletClient.writeContract({
        address: ADDRESSES.chaosToken,
        abi: CHAOS_TOKEN_WRITE_ABI,
        functionName: "approve",
        args: [ADDRESSES.facilityManager, approveAmt],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      log("Upgrading facility...", "info");
      hash = await walletClient.writeContract({
        address: ADDRESSES.facilityManager,
        abi: FACILITY_WRITE_ABI,
        functionName: "upgrade",
        args: [BigInt(agentId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      log("Facility upgraded!", "success");
      await refreshAgentData();
    } catch (err: any) {
      log(`Facility upgrade failed: ${err.message?.slice(0, 60)}`, "error");
    } finally {
      setTxPending(null);
    }
  }, [walletClient, agentId, publicClient, log, refreshAgentData]);

  const buyShield = useCallback(async (tier: number) => {
    if (!walletClient || !agentId || !publicClient) return;
    try {
      setTxPending(`shield-${tier}`);
      const approveAmt = parseEther("100000");
      let hash = await walletClient.writeContract({
        address: ADDRESSES.chaosToken,
        abi: CHAOS_TOKEN_WRITE_ABI,
        functionName: "approve",
        args: [ADDRESSES.shieldManager, approveAmt],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      log(`Purchasing ${SHIELD_NAMES[tier]} shield...`, "info");
      hash = await walletClient.writeContract({
        address: ADDRESSES.shieldManager,
        abi: SHIELD_WRITE_ABI,
        functionName: "purchaseShield",
        args: [BigInt(agentId), tier],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      log(`${SHIELD_NAMES[tier]} activated!`, "success");
      await refreshAgentData();
    } catch (err: any) {
      log(`Shield purchase failed: ${err.message?.slice(0, 60)}`, "error");
    } finally {
      setTxPending(null);
    }
  }, [walletClient, agentId, publicClient, log, refreshAgentData]);

  // ─── Render helpers ──────────────────────────────────────────────────────

  const fmtChaos = (val: bigint) => {
    const num = parseFloat(formatEther(val));
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toFixed(2);
  };

  // ─── Not connected ────────────────────────────────────────────────────────

  // Detect mobile (no injected provider = regular mobile browser, not wallet browser)
  const isMobile = typeof window !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const hasInjected = typeof window !== "undefined" && !!(window as any).ethereum;

  // Deep links open the wallet app which loads the dapp in its built-in browser
  const dappUrl = typeof window !== "undefined" ? window.location.href : "";
  const encodedUrl = encodeURIComponent(dappUrl);
  const mobileWallets = [
    { name: "MetaMask", icon: "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg", deepLink: `https://metamask.app.link/dapp/${dappUrl.replace(/^https?:\/\//, "")}` },
    { name: "Phantom", icon: "/assets/wallets/phantom.svg", deepLink: `https://phantom.app/ul/browse/${encodedUrl}?ref=${encodedUrl}` },
    { name: "Rainbow", icon: "https://avatars.githubusercontent.com/u/48327834?s=200&v=4", deepLink: `https://rnbwapp.com/dapp?url=${encodedUrl}` },
  ];

  // Deduplicate connectors by name, prefer ones with icons (EIP-6963 rdns connectors)
  const deduped = connectors.reduce<(typeof connectors)[number][]>((acc, c) => {
    const idx = acc.findIndex((a) => a.name === c.name);
    if (idx === -1) {
      acc.push(c);
    } else if (c.icon && !acc[idx].icon) {
      acc[idx] = c;
    }
    return acc;
  }, []);

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-white/10 p-6 sm:p-8 text-center animate-fade-in" style={{ backgroundColor: "#0A0E18" }}>
        <h2 className="text-xl font-bold text-white mb-3">Connect Wallet to Mine</h2>
        <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
          Connect the wallet that was registered as your agent&apos;s operator address.
          Your private key never leaves your browser.
        </p>

        {/* Desktop: injected connectors detected by wagmi */}
        {hasInjected && (
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {deduped.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => connect({ connector })}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all btn-press w-28"
                style={{ backgroundColor: "#0D1220" }}
              >
                {connector.icon ? (
                  <img
                    src={connector.icon}
                    alt={connector.name}
                    className="w-10 h-10 rounded-lg"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: "#7B61FF20", color: "#7B61FF" }}
                  >
                    {connector.name.charAt(0)}
                  </div>
                )}
                <span className="text-xs text-gray-300 font-medium truncate w-full">
                  {connector.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Mobile (no injected provider): deep link buttons to open wallet apps */}
        {isMobile && !hasInjected && (
          <>
            <p className="text-gray-500 text-xs mb-3">Tap a wallet to open this page inside the app:</p>
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              {mobileWallets.map((w) => (
                <a
                  key={w.name}
                  href={w.deepLink}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all btn-press w-28"
                  style={{ backgroundColor: "#0D1220" }}
                >
                  <img src={w.icon} alt={w.name} className="w-10 h-10 rounded-lg" />
                  <span className="text-xs text-gray-300 font-medium truncate w-full">{w.name}</span>
                </a>
              ))}
            </div>
          </>
        )}

        {/* Desktop with no wallets detected at all */}
        {!isMobile && !hasInjected && (
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-3">No wallet detected. Install a browser wallet to continue:</p>
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-5 py-2.5 rounded-lg font-semibold text-white transition-all hover:brightness-125 btn-press"
              style={{ background: "linear-gradient(135deg, #7B61FF, #00D4FF)" }}
            >
              Install MetaMask
            </a>
          </div>
        )}

        <p className="text-gray-500 text-xs mt-4">
          Don&apos;t have an agent? Follow the setup guide to register first.
        </p>
      </div>
    );
  }

  // ─── Wrong chain ──────────────────────────────────────────────────────────

  if (wrongChain) {
    return (
      <div className="rounded-xl border border-white/10 p-6 sm:p-8 text-center animate-fade-in" style={{ backgroundColor: "#0A0E18" }}>
        <h2 className="text-lg font-bold text-white mb-2">Wrong Network</h2>
        <p className="text-gray-400 text-sm mb-4">
          Please switch to <span className="text-white font-semibold">Monad Testnet</span> to continue.
        </p>
        <button
          onClick={() => switchChain({ chainId: monadTestnet.id })}
          className="px-5 py-2.5 rounded-lg font-semibold text-white transition-all hover:brightness-125 btn-press"
          style={{ background: "linear-gradient(135deg, #7B61FF, #00D4FF)" }}
        >
          Switch to Monad Testnet
        </button>
        <button
          onClick={() => disconnect()}
          className="ml-3 px-3 py-2 rounded-lg text-xs text-gray-400 border border-white/10 hover:bg-white/5 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // ─── Connected but no agent ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 p-6 text-center" style={{ backgroundColor: "#0A0E18" }}>
        <div className="animate-pulse text-gray-400">Looking up your agent...</div>
      </div>
    );
  }

  if (!agentId || !agent) {
    return (
      <div className="rounded-xl border border-white/10 p-6 sm:p-8 text-center" style={{ backgroundColor: "#0A0E18" }}>
        <h2 className="text-lg font-bold text-white mb-2">No Agent Found</h2>
        <p className="text-gray-400 text-sm mb-4">
          Wallet <span className="text-white font-mono text-xs">{address?.slice(0, 6)}...{address?.slice(-4)}</span> is not registered as an agent operator.
        </p>
        <p className="text-gray-500 text-xs mb-4">
          Register via the onboarding API, then come back here.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => lookupAgent()}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-white/20 text-white hover:bg-white/5 transition-colors"
          >
            Retry Lookup
          </button>
          <button
            onClick={() => disconnect()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // ─── Mining dashboard ─────────────────────────────────────────────────────

  const zoneColor = ZONE_COLORS[agent.zone] || "#6B7280";

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Agent header */}
      <div className="rounded-xl border border-white/10 p-4" style={{ backgroundColor: "#0A0E18" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-lg"
              style={{ backgroundColor: `${zoneColor}30`, border: `1px solid ${zoneColor}60` }}
            >
              #{agent.agentId}
            </div>
            <div>
              <div className="text-white font-semibold flex items-center gap-2">
                Agent #{agent.agentId}
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{ backgroundColor: `${zoneColor}20`, color: zoneColor, border: `1px solid ${zoneColor}40` }}
                >
                  {ZONE_NAMES[agent.zone]?.replace("The ", "") || `Zone ${agent.zone}`}
                </span>
                {mining && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: "#00E5A020", color: "#00E5A0", border: "1px solid #00E5A040" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    MINING
                  </span>
                )}
              </div>
              <div className="text-gray-500 text-xs font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</div>
            </div>
          </div>

          <div className="flex gap-2">
            {!mining ? (
              <button
                onClick={startMining}
                disabled={!!txPending}
                className="px-4 py-2 rounded-lg font-semibold text-white text-sm transition-all hover:brightness-125 btn-press disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #00E5A0, #00D4FF)" }}
              >
                Start Mining
              </button>
            ) : (
              <button
                onClick={stopMining}
                className="px-4 py-2 rounded-lg font-semibold text-white text-sm transition-all hover:brightness-125 btn-press"
                style={{ background: "linear-gradient(135deg, #FF6B35, #FF4444)" }}
              >
                Stop Mining
              </button>
            )}
            <button
              onClick={() => disconnect()}
              className="px-3 py-2 rounded-lg text-xs text-gray-400 border border-white/10 hover:bg-white/5 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="CHAOS Balance" value={fmtChaos(balance)} color="#00D4FF" />
        <StatCard label="Pending Rewards" value={fmtChaos(pendingRewards)} color="#00E5A0" />
        <StatCard label="Hashrate" value={`${effectiveHashrate.toString()} H/s`} color="#7B61FF" />
        <StatCard label="Total Mined" value={fmtChaos(agent.totalMined)} color="#FFA500" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Rigs" value={`${rigCount}`} color="#48BB78" />
        <StatCard
          label="Facility"
          value={facility ? `L${facility.level} ${FACILITY_NAMES[facility.level] || ""}` : "L0"}
          color="#3498DB"
        />
        <StatCard label="Power" value={facility ? `${usedPower}/${facility.powerOutput}W` : "0/0W"} color="#ECC94B" />
        <StatCard
          label="Shield"
          value={shield?.tier ? `${SHIELD_NAMES[shield.tier]} (${shield.charges})` : "None"}
          color="#E74C3C"
        />
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-white/10 p-4" style={{ backgroundColor: "#0A0E18" }}>
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={doHeartbeat}
            disabled={!!txPending}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {txPending === "heartbeat" ? "..." : "Heartbeat"}
          </button>
          <button
            onClick={doClaim}
            disabled={!!txPending}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {txPending === "claim" ? "..." : "Claim Rewards"}
          </button>
          <span className="w-px h-6 bg-white/10 self-center" />
          {[0, 1, 2, 3, 4].map((tier) => (
            <button
              key={tier}
              onClick={() => buyRig(tier)}
              disabled={!!txPending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 hover:brightness-125"
              style={{
                backgroundColor: `${RIG_TIER_COLORS[tier]}15`,
                color: RIG_TIER_COLORS[tier],
                border: `1px solid ${RIG_TIER_COLORS[tier]}40`,
              }}
            >
              {txPending === `rig-${tier}` ? "..." : `Buy ${RIG_NAMES[tier]}`}
            </button>
          ))}
          <span className="w-px h-6 bg-white/10 self-center" />
          <button
            onClick={upgradeFacility}
            disabled={!!txPending}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
          >
            {txPending === "facility" ? "..." : "Upgrade Facility"}
          </button>
          {[1, 2].map((tier) => (
            <button
              key={tier}
              onClick={() => buyShield(tier)}
              disabled={!!txPending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {txPending === `shield-${tier}` ? "..." : `Buy ${SHIELD_NAMES[tier]}`}
            </button>
          ))}
        </div>
      </div>

      {/* Mining log */}
      <div className="rounded-xl border border-white/10 p-4" style={{ backgroundColor: "#0A0E18" }}>
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Mining Log</h3>
        <div className="h-48 overflow-y-auto text-xs font-mono space-y-0.5 scrollbar-hide" style={{ color: "#9CA3AF" }}>
          {logs.length === 0 && <div className="text-gray-600">No activity yet. Start mining to see logs.</div>}
          {logs.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-600 shrink-0">{new Date(entry.ts).toLocaleTimeString()}</span>
              <span style={{
                color: entry.type === "success" ? "#00E5A0"
                  : entry.type === "error" ? "#FF4444"
                  : entry.type === "warn" ? "#FFA500"
                  : "#9CA3AF",
              }}>
                {entry.msg}
              </span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-lg border border-white/10 p-3 card-hover"
      style={{ backgroundColor: "#0A0E18" }}
    >
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-semibold truncate" style={{ color, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}
