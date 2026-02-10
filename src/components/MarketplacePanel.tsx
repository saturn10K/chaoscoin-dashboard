"use client";

import { useMarketplace, MarketplaceListing, MarketplaceSale, DynamicPrice, OTCOffer, TradeReputation } from "../hooks/useMarketplace";
import { RIG_NAMES, RIG_TIER_COLORS } from "../lib/constants";

function formatChaos(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function getRepColor(rep?: TradeReputation): string {
  if (!rep || rep.tier === "none") return "#6B7280";
  if (rep.tier === "low") return "#ECC94B";
  if (rep.tier === "medium") return "#48BB78";
  return "#3B82F6"; // high
}

function RepBadge({ rep }: { rep?: TradeReputation }) {
  if (!rep || rep.tradeCount === 0) return null;
  const color = getRepColor(rep);
  const label = rep.badge || `${rep.tradeCount} trades`;
  return (
    <span
      className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
      title={`Trade reputation: ${rep.tradeCount} trades, score ${rep.score}`}
    >
      {label}
    </span>
  );
}

export default function MarketplacePanel() {
  const { listings, sales, prices, stats, otcOffers, loading } = useMarketplace();

  const activeOtcOffers = otcOffers.filter(o => o.status === "active" || o.status === "accepted");
  const completedOtcOffers = otcOffers.filter(o => o.status === "completed");

  return (
    <div
      className="rounded-lg p-4 glow-border"
      style={{ background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <h2
        className="text-sm font-semibold mb-3 uppercase tracking-wider"
        style={{ color: "#00D4FF" }}
      >
        Marketplace
      </h2>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <StatBox label="Listings" value={stats.activeListings} color="#00D4FF" />
          <StatBox label="Sold" value={stats.totalSales} color="#00E5A0" />
          <StatBox label="Burned" value={formatChaos(stats.totalBurned)} color="#FF6B35" />
          <StatBox label="OTC" value={stats.otc?.activeOffers ?? 0} color="#A78BFA" />
        </div>
      )}

      {/* Dynamic Prices */}
      {prices.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Dynamic Rig Prices
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {prices.map(price => (
              <PriceCard key={price.tier} price={price} />
            ))}
          </div>
        </div>
      )}

      {/* Active Listings */}
      {listings.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Active Listings
          </div>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {listings.slice(0, 8).map(listing => (
              <ListingRow key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      )}

      {/* OTC Offers */}
      {activeOtcOffers.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            OTC Offers <span style={{ color: "#A78BFA" }}>CHAOS/MON</span>
          </div>
          <div className="space-y-1 max-h-[120px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {activeOtcOffers.slice(0, 6).map(offer => (
              <OTCRow key={offer.id} offer={offer} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Sales */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Recent Sales
        </div>
        {sales.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-3">
            {loading ? "Loading marketplace..." : "No sales yet..."}
          </div>
        ) : (
          <div className="space-y-1 max-h-[120px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {sales.slice(0, 8).map((sale, i) => (
              <SaleRow key={`${sale.listingId}-${i}`} sale={sale} />
            ))}
          </div>
        )}
      </div>

      {/* Recent OTC Completions */}
      {completedOtcOffers.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Recent OTC Trades
          </div>
          <div className="space-y-1 max-h-[80px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {completedOtcOffers.slice(0, 4).map(offer => (
              <OTCCompletedRow key={offer.id} offer={offer} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PriceCard({ price }: { price: DynamicPrice }) {
  const tierColor = RIG_TIER_COLORS[price.tier] || "#6B7280";
  const rigName = RIG_NAMES[price.tier] || `T${price.tier}`;
  const markup = parseFloat(price.effectiveCost) > 0 && parseFloat(price.baseCost) > 0
    ? ((parseFloat(price.effectiveCost) / parseFloat(price.baseCost) - 1) * 100).toFixed(0)
    : "0";

  return (
    <div
      className="rounded p-1.5 text-center"
      style={{ background: "rgba(255,255,255,0.03)", borderTop: `2px solid ${tierColor}` }}
    >
      <div className="text-xs font-medium" style={{ color: tierColor }}>
        {rigName.split(" ")[0]}
      </div>
      <div className="text-xs font-mono text-gray-300">
        {formatChaos(price.effectiveCost)}
      </div>
      {parseInt(markup) > 0 && (
        <div className="text-xs text-yellow-500">+{markup}%</div>
      )}
      <div className="text-xs text-gray-600">{price.totalOwned} owned</div>
    </div>
  );
}

function ListingRow({ listing }: { listing: MarketplaceListing }) {
  const tierColor = RIG_TIER_COLORS[listing.rigTier] || "#6B7280";
  const rigName = RIG_NAMES[listing.rigTier] || `T${listing.rigTier} Rig`;

  return (
    <div
      className="flex items-center justify-between rounded p-2 card-hover"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium"
          style={{ background: `${tierColor}20`, color: tierColor }}
        >
          T{listing.rigTier}
        </span>
        <div>
          <div className="text-xs text-gray-300 flex items-center gap-1">
            {rigName}
            <RepBadge rep={listing.sellerReputation} />
          </div>
          <div className="text-xs text-gray-600">by Agent #{listing.sellerAgentId}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-mono text-yellow-400">
          {formatChaos(listing.price)} CHAOS
        </div>
        <div className="text-xs text-gray-600">{timeAgo(listing.listedAt)}</div>
      </div>
    </div>
  );
}

function OTCRow({ offer }: { offer: OTCOffer }) {
  const isSelling = offer.type === "sell_chaos";
  const color = isSelling ? "#FF6B35" : "#48BB78";
  const label = isSelling ? "SELL" : "BUY";

  return (
    <div className="flex items-center gap-2 text-xs py-1 px-2 rounded"
      style={{ background: "rgba(255,255,255,0.03)" }}>
      <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: `${color}20`, color }}>
        {label}
      </span>
      <span className="text-gray-300 flex-1 flex items-center gap-1">
        #{offer.agentId}
        <RepBadge rep={offer.reputation} />
      </span>
      <span className="font-mono text-yellow-400">{formatChaos(offer.chaosAmount)}</span>
      <span className="text-gray-500">for</span>
      <span className="font-mono text-purple-400">{offer.monPrice} MON</span>
      {offer.status === "accepted" && (
        <span className="text-xs text-blue-400">pending</span>
      )}
      <span className="text-gray-600">{timeAgo(offer.createdAt)}</span>
    </div>
  );
}

function OTCCompletedRow({ offer }: { offer: OTCOffer }) {
  const isSelling = offer.type === "sell_chaos";

  return (
    <div className="flex items-center gap-2 text-xs py-1">
      <span className="text-purple-400">OTC</span>
      <span className="text-gray-400 flex-1">
        #{offer.agentId} {isSelling ? "→" : "←"} #{offer.counterpartyAgentId}
      </span>
      <span className="font-mono text-yellow-400">{formatChaos(offer.chaosAmount)}</span>
      <span className="font-mono text-purple-400">{offer.monPrice} MON</span>
      <span className="text-gray-600">{offer.completedAt ? timeAgo(offer.completedAt) : ""}</span>
    </div>
  );
}

function SaleRow({ sale }: { sale: MarketplaceSale }) {
  const tierColor = RIG_TIER_COLORS[sale.rigTier] || "#6B7280";

  return (
    <div className="flex items-center gap-2 text-xs py-1">
      <span
        className="px-1 py-0.5 rounded"
        style={{ background: `${tierColor}20`, color: tierColor }}
      >
        T{sale.rigTier}
      </span>
      <span className="text-gray-400 flex-1">
        #{sale.sellerAgentId} → #{sale.buyerAgentId}
      </span>
      <span className="font-mono text-yellow-400">{formatChaos(sale.price)}</span>
      <span className="text-red-400 font-mono">-{formatChaos(sale.burned)}</span>
      <span className="text-gray-600">{timeAgo(sale.timestamp)}</span>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded p-2 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="text-lg font-bold" style={{ color, fontFamily: "monospace" }}>
        {value}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
