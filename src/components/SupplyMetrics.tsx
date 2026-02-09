"use client";

function formatNumber(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface BurnsBySource {
  mining: string;
  rigPurchase: string;
  facilityUpgrade: string;
  rigRepair: string;
  shieldPurchase: string;
  migration: string;
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
];

export default function SupplyMetrics({
  totalMinted,
  totalBurned,
  circulatingSupply,
  burnRatio,
  burnsBySource,
}: SupplyMetricsProps) {
  const totalBurnedNum = parseFloat(totalBurned) || 0;

  // Compute source percentages for the bar chart
  const sourceValues = BURN_SOURCE_LABELS.map((s) => ({
    ...s,
    value: parseFloat(burnsBySource[s.key]) || 0,
  }));
  const maxSourceValue = Math.max(...sourceValues.map((s) => s.value), 1);

  return (
    <div
      className="rounded-lg border border-white/10 overflow-hidden"
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
          <div className="rounded-md p-3 border border-white/5" style={{ backgroundColor: "#06080D" }}>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider mb-1">
              <img src="/assets/icons/hashrate_indicator_green.png" alt="" className="w-3.5 h-3.5" />
              Total Minted
            </div>
            <div
              className="text-lg font-bold"
              style={{ color: "#00E5A0", fontFamily: "monospace" }}
            >
              {formatNumber(totalMinted)}
            </div>
          </div>

          {/* Total Burned */}
          <div className="rounded-md p-3 border border-white/5" style={{ backgroundColor: "#06080D" }}>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider mb-1">
              <img src="/assets/icons/token_burn.png" alt="" className="w-3.5 h-3.5" />
              Total Burned
            </div>
            <div
              className="text-lg font-bold"
              style={{ color: "#FF6B35", fontFamily: "monospace" }}
            >
              {formatNumber(totalBurned)}
            </div>
          </div>

          {/* Circulating Supply */}
          <div className="rounded-md p-3 border border-white/5" style={{ backgroundColor: "#06080D" }}>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Circulating
            </div>
            <div
              className="text-lg font-bold text-gray-200"
              style={{ fontFamily: "monospace" }}
            >
              {formatNumber(circulatingSupply)}
            </div>
          </div>

          {/* Burn Ratio */}
          <div className="rounded-md p-3 border border-white/5" style={{ backgroundColor: "#06080D" }}>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Burn Ratio
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-lg font-bold"
                style={{ color: "#FF6B35", fontFamily: "monospace" }}
              >
                {burnRatio.toFixed(2)}%
              </span>
            </div>
            {/* Burn ratio bar */}
            <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
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
                      className="h-full rounded-full transition-all duration-500"
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
                    {formatNumber(burnsBySource[source.key])}
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
