"use client";

import { useRef, useEffect, useState, useCallback } from "react";

function formatNumber(val: number): string {
  if (isNaN(val)) return "0.00";
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Easing function — ease-out cubic for a snappy-then-smooth feel */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Hook that animates a number counting from its previous value to the new value */
function useCountUp(target: string, duration = 1500): number {
  const targetNum = parseFloat(target) || 0;
  const [display, setDisplay] = useState(targetNum);
  const prevRef = useRef(targetNum);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = targetNum;
    prevRef.current = to;

    // Skip animation on first render or if no change
    if (from === to) {
      setDisplay(to);
      return;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = from + (to - from) * eased;
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetNum, duration]);

  return display;
}

interface BurnsBySource {
  mining: string;
  rigPurchase: string;
  facilityUpgrade: string;
  rigRepair: string;
  shieldPurchase: string;
  migration: string;
  marketplace: string;
  sabotage: string;
}

interface SupplyMetricsProps {
  totalMinted: string;
  totalBurned: string;
  circulatingSupply: string;
  burnRatio: number;
  burnsBySource: BurnsBySource;
}

const BURN_SOURCE_LABELS: { key: keyof BurnsBySource; label: string; color: string }[] = [
  { key: "mining", label: "Mining Tax", color: "#FF6B35" },
  { key: "rigPurchase", label: "Rig Purchase", color: "#ECC94B" },
  { key: "facilityUpgrade", label: "Facility Upgrade", color: "#7B61FF" },
  { key: "rigRepair", label: "Rig Repair", color: "#ED8936" },
  { key: "shieldPurchase", label: "Shield Purchase", color: "#3498DB" },
  { key: "migration", label: "Zone Migration", color: "#ED8936" },
  { key: "marketplace", label: "Marketplace", color: "#00D4FF" },
  { key: "sabotage", label: "Sabotage", color: "#FF4444" },
];

/** Hook to detect when a value changes and trigger a glow pop */
function useGlowPop(value: string): boolean {
  const prevRef = useRef(value);
  const [glowing, setGlowing] = useState(false);

  useEffect(() => {
    if (prevRef.current !== value && prevRef.current !== "0" && prevRef.current !== "0.00") {
      // Value changed (and wasn't the initial "0" → first load)
      setGlowing(true);
      const timer = setTimeout(() => setGlowing(false), 700);
      return () => clearTimeout(timer);
    }
    prevRef.current = value;
  }, [value]);

  // Also update ref when not glowing
  useEffect(() => {
    prevRef.current = value;
  });

  return glowing;
}

export default function SupplyMetrics({
  totalMinted,
  totalBurned,
  circulatingSupply,
  burnRatio,
  burnsBySource,
}: SupplyMetricsProps) {
  const mintedGlow = useGlowPop(totalMinted);
  const burnedGlow = useGlowPop(totalBurned);

  // Animated counting values
  const animatedMinted = useCountUp(totalMinted);
  const animatedBurned = useCountUp(totalBurned);
  const animatedCirculating = useCountUp(circulatingSupply);
  const animatedBurnRatio = useCountUp(burnRatio.toFixed(4), 2000);
  const totalBurnedNum = animatedBurned;

  // Compute source percentages for the bar chart
  const sourceValues = BURN_SOURCE_LABELS.map((s) => ({
    ...s,
    value: parseFloat(burnsBySource[s.key]) || 0,
  }));
  const maxSourceValue = Math.max(...sourceValues.map((s) => s.value), 1);

  return (
    <div
      className="rounded-lg border border-white/10 overflow-hidden glow-border"
      style={{ backgroundColor: "#0D1117" }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 border-b border-white/10"
        style={{ backgroundColor: "#06080D" }}
      >
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ color: "#7B61FF" }}
        >
          Supply Metrics
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Top-level metrics in a 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Minted */}
          <div className="rounded-md p-3 border border-white/5 card-hover" style={{ backgroundColor: "#06080D" }}>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider mb-1">
              <img src="/assets/icons/hashrate_indicator_green.png" alt="" className="w-3.5 h-3.5" />
              Total Minted
            </div>
            <div
              className={`text-lg font-bold ${mintedGlow ? "glow-pop" : ""}`}
              key={mintedGlow ? `minted-${Date.now()}` : "minted-stable"}
              style={{ color: "#00E5A0", fontFamily: "monospace" }}
            >
              {formatNumber(animatedMinted)}
            </div>
          </div>

          {/* Total Burned */}
          <div className="rounded-md p-3 border border-white/5 card-hover" style={{ backgroundColor: "#06080D" }}>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider mb-1">
              <img src="/assets/icons/token_burn.png" alt="" className="w-3.5 h-3.5" />
              Total Burned
            </div>
            <div
              className={`text-lg font-bold ${burnedGlow ? "glow-pop" : ""}`}
              key={burnedGlow ? `burned-${Date.now()}` : "burned-stable"}
              style={{ color: "#FF6B35", fontFamily: "monospace" }}
            >
              {formatNumber(animatedBurned)}
            </div>
          </div>

          {/* Circulating Supply */}
          <div className="rounded-md p-3 border border-white/5 card-hover" style={{ backgroundColor: "#06080D" }}>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Circulating
            </div>
            <div
              className="text-lg font-bold text-gray-200"
              style={{ fontFamily: "monospace" }}
            >
              {formatNumber(animatedCirculating)}
            </div>
          </div>

          {/* Burn Ratio */}
          <div className="rounded-md p-3 border border-white/5 card-hover" style={{ backgroundColor: "#06080D" }}>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Burn Ratio
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-lg font-bold"
                style={{ color: "#FF6B35", fontFamily: "monospace" }}
              >
                {animatedBurnRatio.toFixed(2)}%
              </span>
            </div>
            {/* Burn ratio bar */}
            <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bar-transition"
                style={{
                  width: `${Math.min(burnRatio, 100)}%`,
                  background: "linear-gradient(90deg, #FF6B35, #FF6B3580)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Burn Breakdown */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Burns by Source
          </div>
          <div className="space-y-2">
            {sourceValues.map((source) => {
              const pct =
                totalBurnedNum > 0
                  ? ((source.value / totalBurnedNum) * 100).toFixed(1)
                  : "0.0";
              const barWidth =
                maxSourceValue > 0
                  ? (source.value / maxSourceValue) * 100
                  : 0;

              return (
                <div key={source.key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-28 flex-shrink-0 truncate">
                    {source.label}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bar-transition"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: source.color,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs text-gray-400 w-20 text-right flex-shrink-0"
                    style={{ fontFamily: "monospace" }}
                  >
                    {formatNumber(source.value)}
                  </span>
                  <span className="text-xs text-gray-600 w-10 text-right flex-shrink-0">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
