"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { RefreshIcon } from "./icons";
import { formatEther, parseEther } from "viem";
import { publicClient, monadTestnet, ADDRESSES, CHAOS_TOKEN_WRITE_ABI } from "../lib/contracts";

// ─── ChaosSwap contract address (set after deployment) ───────────────────────
const CHAOS_SWAP_ADDRESS = (process.env.NEXT_PUBLIC_CHAOS_SWAP_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const NAD_CHAOS_ADDRESS = (process.env.NEXT_PUBLIC_NAD_CHAOS_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

// ─── Minimal ABIs ────────────────────────────────────────────────────────────
const CHAOS_SWAP_ABI = [
  { inputs: [{ type: "uint256" }], name: "swapToNad", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ type: "uint256" }], name: "swapToGame", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "gameReserve", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "nadReserve", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "feeToNadBps", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "feeToGameBps", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ type: "uint256" }, { type: "bool" }], name: "getAmountOut", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSwappedToNad", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSwappedToGame", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalFeeCollected", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
] as const;

const ERC20_ABI = [
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "name", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
] as const;

type Direction = "toNad" | "toGame";

function fmtBig(val: bigint, decimals = 2): string {
  const str = formatEther(val);
  const num = parseFloat(str);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(decimals);
}

export default function TradePanel() {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const wrongChain = isConnected && chainId !== monadTestnet.id;

  // Balances
  const [gameBalance, setGameBalance] = useState<bigint>(0n);
  const [nadBalance, setNadBalance] = useState<bigint>(0n);

  // Reserves
  const [gameReserve, setGameReserve] = useState<bigint>(0n);
  const [nadReserve, setNadReserve] = useState<bigint>(0n);

  // Swap state
  const [direction, setDirection] = useState<Direction>("toNad");
  const [inputAmount, setInputAmount] = useState("");
  const [amountOut, setAmountOut] = useState<bigint>(0n);
  const [feeToNadBps, setFeeToNadBps] = useState(0n);
  const [feeToGameBps, setFeeToGameBps] = useState(0n);
  const [isPaused, setIsPaused] = useState(false);

  // Stats
  const [totalToNad, setTotalToNad] = useState<bigint>(0n);
  const [totalToGame, setTotalToGame] = useState<bigint>(0n);
  const [totalFee, setTotalFee] = useState<bigint>(0n);

  // TX state
  const [txPending, setTxPending] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<{ hash: string; success: boolean } | null>(null);

  const isZeroAddress = CHAOS_SWAP_ADDRESS === "0x0000000000000000000000000000000000000000";

  // ─── Load reserves + stats ──────────────────────────────────────────────
  const refreshData = useCallback(async () => {
    if (isZeroAddress) return;
    try {
      const [gr, nr, ftn, ftg, paused, ttn, ttg, tf] = await Promise.all([
        publicClient.readContract({ address: CHAOS_SWAP_ADDRESS, abi: CHAOS_SWAP_ABI, functionName: "gameReserve" }),
        publicClient.readContract({ address: CHAOS_SWAP_ADDRESS, abi: CHAOS_SWAP_ABI, functionName: "nadReserve" }),
        publicClient.readContract({ address: CHAOS_SWAP_ADDRESS, abi: CHAOS_SWAP_ABI, functionName: "feeToNadBps" }),
        publicClient.readContract({ address: CHAOS_SWAP_ADDRESS, abi: CHAOS_SWAP_ABI, functionName: "feeToGameBps" }),
        publicClient.readContract({ address: CHAOS_SWAP_ADDRESS, abi: CHAOS_SWAP_ABI, functionName: "paused" }),
        publicClient.readContract({ address: CHAOS_SWAP_ADDRESS, abi: CHAOS_SWAP_ABI, functionName: "totalSwappedToNad" }),
        publicClient.readContract({ address: CHAOS_SWAP_ADDRESS, abi: CHAOS_SWAP_ABI, functionName: "totalSwappedToGame" }),
        publicClient.readContract({ address: CHAOS_SWAP_ADDRESS, abi: CHAOS_SWAP_ABI, functionName: "totalFeeCollected" }),
      ]);
      setGameReserve(gr as bigint);
      setNadReserve(nr as bigint);
      setFeeToNadBps(ftn as bigint);
      setFeeToGameBps(ftg as bigint);
      setIsPaused(paused as boolean);
      setTotalToNad(ttn as bigint);
      setTotalToGame(ttg as bigint);
      setTotalFee(tf as bigint);
    } catch { /* swap not deployed yet */ }
  }, [isZeroAddress]);

  // ─── Load user balances ─────────────────────────────────────────────────
  const refreshBalances = useCallback(async () => {
    if (!address || isZeroAddress) return;
    try {
      const [gb, nb] = await Promise.all([
        publicClient.readContract({ address: ADDRESSES.chaosToken, abi: ERC20_ABI, functionName: "balanceOf", args: [address] }),
        publicClient.readContract({ address: NAD_CHAOS_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address] }),
      ]);
      setGameBalance(gb as bigint);
      setNadBalance(nb as bigint);
    } catch { /* token not available */ }
  }, [address, isZeroAddress]);

  useEffect(() => {
    refreshData();
    refreshBalances();
    const interval = setInterval(() => { refreshData(); refreshBalances(); }, 15_000);
    return () => clearInterval(interval);
  }, [refreshData, refreshBalances]);

  // ─── Compute amount out on input change ─────────────────────────────────
  useEffect(() => {
    if (!inputAmount || isZeroAddress) { setAmountOut(0n); return; }
    try {
      const wei = parseEther(inputAmount);
      if (wei === 0n) { setAmountOut(0n); return; }
      publicClient.readContract({
        address: CHAOS_SWAP_ADDRESS, abi: CHAOS_SWAP_ABI,
        functionName: "getAmountOut", args: [wei, direction === "toNad"],
      }).then((out) => setAmountOut(out as bigint)).catch(() => setAmountOut(0n));
    } catch { setAmountOut(0n); }
  }, [inputAmount, direction, isZeroAddress]);

  // ─── Swap execution ─────────────────────────────────────────────────────
  const doSwap = async () => {
    if (!walletClient || !inputAmount || isZeroAddress) return;
    const wei = parseEther(inputAmount);
    if (wei === 0n) return;

    try {
      setTxPending("approve");
      setLastTx(null);

      const tokenAddr = direction === "toNad" ? ADDRESSES.chaosToken : NAD_CHAOS_ADDRESS;

      // Approve
      const approveHash = await walletClient.writeContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CHAOS_SWAP_ADDRESS, wei],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash, timeout: 60_000 });

      // Swap
      setTxPending("swap");
      const fn = direction === "toNad" ? "swapToNad" : "swapToGame";
      const swapHash = await walletClient.writeContract({
        address: CHAOS_SWAP_ADDRESS,
        abi: CHAOS_SWAP_ABI,
        functionName: fn,
        args: [wei],
      });
      await publicClient.waitForTransactionReceipt({ hash: swapHash, timeout: 60_000 });

      setLastTx({ hash: swapHash, success: true });
      setInputAmount("");
      setAmountOut(0n);
      await Promise.all([refreshData(), refreshBalances()]);
    } catch (err: any) {
      setLastTx({ hash: "", success: false });
      console.error("Swap failed:", err);
    } finally {
      setTxPending(null);
    }
  };

  const inputBalance = direction === "toNad" ? gameBalance : nadBalance;
  const outputReserve = direction === "toNad" ? nadReserve : gameReserve;
  const inputLabel = direction === "toNad" ? "pCHAOS" : "$CHAOS";
  const outputLabel = direction === "toNad" ? "$CHAOS" : "pCHAOS";

  const setMax = () => {
    if (inputBalance > 0n) setInputAmount(formatEther(inputBalance));
  };

  const flipDirection = () => {
    setDirection((d) => (d === "toNad" ? "toGame" : "toNad"));
    setInputAmount("");
    setAmountOut(0n);
  };

  // ─── Not deployed state ─────────────────────────────────────────────────
  if (isZeroAddress) {
    return (
      <div className="rounded-xl border border-white/10 p-6 sm:p-8" style={{ backgroundColor: "#0A0E18" }}>
        <div className="text-center space-y-4">
          <div className="flex justify-center"><RefreshIcon size={36} /></div>
          <h2 className="text-lg font-bold text-white">ChaosSwap Bridge</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Swap between in-game pCHAOS (210B supply) and nad.fun $CHAOS (1B supply) at a fixed 210:1 rate.
          </p>
          <div className="rounded-lg border border-yellow-500/20 p-4" style={{ backgroundColor: "#1a150005" }}>
            <p className="text-yellow-400 text-sm font-medium">Coming Soon</p>
            <p className="text-yellow-400/60 text-xs mt-1">
              The ChaosSwap bridge will be live once the $CHAOS token is created on nad.fun and the swap contract is deployed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <InfoCard label="Rate" value="210 : 1" color="#7B61FF" />
            <InfoCard label="Fee" value="0%" color="#00E5A0" />
            <InfoCard label="Direction" value="Both ways" color="#00D4FF" />
          </div>

          <div className="rounded-lg border border-white/5 p-4 text-left space-y-2" style={{ backgroundColor: "#0D1220" }}>
            <h3 className="text-xs font-semibold text-gray-300">How it works</h3>
            <div className="space-y-1.5">
              <Step num={1} color="#00E5A0" text="Mine pCHAOS in-game through the mining dashboard" />
              <Step num={2} color="#00D4FF" text="Swap 210 pCHAOS for 1 $CHAOS on this page" />
              <Step num={3} color="#FF9D3D" text="Trade $CHAOS on the open market via nad.fun" />
              <Step num={4} color="#7B61FF" text="Or buy $CHAOS on nad.fun and swap into the game" />
            </div>
          </div>

          <a
            href="https://nad.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:brightness-125 btn-press"
            style={{ backgroundColor: "#7B61FF20", color: "#7B61FF", border: "1px solid #7B61FF40" }}
          >
            Visit nad.fun
          </a>
        </div>
      </div>
    );
  }

  // ─── Not connected state ────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="rounded-xl border border-white/10 p-6 text-center" style={{ backgroundColor: "#0A0E18" }}>
        <h2 className="text-lg font-bold text-white mb-2">Connect Wallet to Trade</h2>
        <p className="text-gray-400 text-sm">Connect your wallet to swap between pCHAOS and $CHAOS.</p>
      </div>
    );
  }

  if (wrongChain) {
    return (
      <div className="rounded-xl border border-white/10 p-6 text-center" style={{ backgroundColor: "#0A0E18" }}>
        <h2 className="text-lg font-bold text-white mb-2">Wrong Network</h2>
        <p className="text-gray-400 text-sm">Please switch to Monad Testnet to use ChaosSwap.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoCard label="pCHAOS Reserve" value={fmtBig(gameReserve)} color="#00E5A0" />
        <InfoCard label="$CHAOS Reserve" value={fmtBig(nadReserve)} color="#7B61FF" />
        <InfoCard label="Total Swapped" value={fmtBig(totalToNad + totalToGame)} color="#00D4FF" />
        <InfoCard label="Fees Collected" value={fmtBig(totalFee)} color="#FF6B35" />
      </div>

      {/* Swap card */}
      <div className="rounded-xl border border-white/10 p-5 sm:p-6" style={{ backgroundColor: "#0A0E18" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Swap</h2>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-500" style={{ fontFamily: "monospace" }}>
              210 pCHAOS = 1 $CHAOS
            </span>
            <span className="text-[10px] text-gray-500">
              Fee: {(Number(direction === "toNad" ? feeToNadBps : feeToGameBps) / 100).toFixed(0)}%
              {inputAmount && amountOut > 0n && (() => {
                try {
                  const inWei = parseEther(inputAmount);
                  const fee = inWei > amountOut ? inWei - amountOut : 0n;
                  return fee > 0n ? ` (${fmtBig(fee)} ${inputLabel})` : "";
                } catch { return ""; }
              })()}
            </span>
          </div>
        </div>

        {isPaused && (
          <div className="rounded-lg border border-red-500/30 p-3 mb-4 text-center" style={{ backgroundColor: "#1a000005" }}>
            <span className="text-red-400 text-sm font-medium">Bridge Paused</span>
          </div>
        )}

        {/* Input token */}
        <div className="rounded-lg border border-white/10 p-4 mb-2" style={{ backgroundColor: "#0D1220" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">From</span>
            <button onClick={setMax} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
              Balance: {fmtBig(inputBalance)} — <span style={{ color: "#7B61FF" }}>MAX</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputAmount}
              onChange={(e) => {
                const v = e.target.value;
                if (/^\d*\.?\d*$/.test(v)) setInputAmount(v);
              }}
              placeholder="0.0"
              className="flex-1 bg-transparent text-xl font-semibold text-white outline-none placeholder:text-gray-600"
              style={{ fontFamily: "monospace" }}
            />
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap"
              style={{
                backgroundColor: direction === "toNad" ? "#00E5A015" : "#7B61FF15",
                color: direction === "toNad" ? "#00E5A0" : "#7B61FF",
                border: `1px solid ${direction === "toNad" ? "#00E5A030" : "#7B61FF30"}`,
              }}
            >
              {inputLabel}
            </span>
          </div>
        </div>

        {/* Flip button */}
        <div className="flex justify-center -my-1 relative z-10">
          <button
            onClick={flipDirection}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-all btn-press"
            style={{ backgroundColor: "#0D1220" }}
          >
            ↕
          </button>
        </div>

        {/* Output token */}
        <div className="rounded-lg border border-white/10 p-4 mt-2 mb-4" style={{ backgroundColor: "#0D1220" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">To</span>
            <span className="text-[10px] text-gray-500">
              Reserve: {fmtBig(outputReserve)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="flex-1 text-xl font-semibold"
              style={{ fontFamily: "monospace", color: amountOut > 0n ? "#E2E8F0" : "#4A5568" }}
            >
              {amountOut > 0n ? fmtBig(amountOut, 4) : "0.0"}
            </span>
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap"
              style={{
                backgroundColor: direction === "toNad" ? "#7B61FF15" : "#00E5A015",
                color: direction === "toNad" ? "#7B61FF" : "#00E5A0",
                border: `1px solid ${direction === "toNad" ? "#7B61FF30" : "#00E5A030"}`,
              }}
            >
              {outputLabel}
            </span>
          </div>
        </div>

        {/* Insufficient reserves warning */}
        {inputAmount && amountOut > 0n && amountOut > outputReserve && (
          <div className="rounded-lg border border-red-500/30 p-2.5 mb-3 text-center" style={{ backgroundColor: "#1a000008" }}>
            <span className="text-red-400 text-xs font-medium">Insufficient liquidity — not enough {outputLabel} in reserves</span>
          </div>
        )}

        {/* Insufficient balance warning */}
        {inputAmount && (() => {
          try {
            return parseEther(inputAmount) > inputBalance;
          } catch { return false; }
        })() && (
          <div className="rounded-lg border border-yellow-500/30 p-2.5 mb-3 text-center" style={{ backgroundColor: "#1a150008" }}>
            <span className="text-yellow-400 text-xs font-medium">Insufficient {inputLabel} balance</span>
          </div>
        )}

        {/* Swap button */}
        <button
          onClick={doSwap}
          disabled={!inputAmount || isPaused || !!txPending || amountOut === 0n || (amountOut > outputReserve)}
          className="w-full py-3 rounded-lg font-semibold text-sm transition-all btn-press disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: txPending
              ? "#4A556820"
              : "linear-gradient(135deg, #7B61FF, #00D4FF)",
            color: txPending ? "#9CA3AF" : "#fff",
          }}
        >
          {txPending === "approve"
            ? "Approving..."
            : txPending === "swap"
            ? "Swapping..."
            : isPaused
            ? "Bridge Paused"
            : !inputAmount
            ? "Enter Amount"
            : amountOut > outputReserve
            ? "Insufficient Liquidity"
            : `Swap ${inputLabel} → ${outputLabel}`}
        </button>

        {/* Last TX feedback */}
        {lastTx && (
          <div className={`mt-3 rounded-lg border p-2.5 text-center text-xs ${
            lastTx.success
              ? "border-green-500/20 text-green-400"
              : "border-red-500/20 text-red-400"
          }`} style={{ backgroundColor: lastTx.success ? "#00200008" : "#20000008" }}>
            {lastTx.success ? (
              <>
                Swap confirmed!{" "}
                {lastTx.hash && (
                  <a
                    href={`https://testnet.monadexplorer.com/tx/${lastTx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: "#00D4FF" }}
                  >
                    View tx
                  </a>
                )}
              </>
            ) : (
              "Swap failed — check console for details"
            )}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-white/10 p-5" style={{ backgroundColor: "#0A0E18" }}>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">How ChaosSwap Works</h3>
        <div className="space-y-2">
          <Step num={1} color="#00E5A0" text="Mine pCHAOS in-game via heartbeats and claims" />
          <Step num={2} color="#00D4FF" text="Swap 210 pCHAOS for 1 $CHAOS here (210:1 rate)" />
          <Step num={3} color="#FF9D3D" text="Trade $CHAOS on nad.fun's bonding curve" />
          <Step num={4} color="#7B61FF" text="Buy $CHAOS on nad.fun and swap back to pCHAOS" />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-white/10 p-3 card-hover" style={{ backgroundColor: "#0A0E18" }}>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-semibold truncate" style={{ color, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

function Step({ num, color, text }: { num: number; color: string; text: string }) {
  return (
    <div className="flex gap-2.5 items-start">
      <span
        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {num}
      </span>
      <span className="text-xs text-gray-400 leading-relaxed">{text}</span>
    </div>
  );
}
