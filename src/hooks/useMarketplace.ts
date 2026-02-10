import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://chaoscoin-production.up.railway.app";

export interface TradeReputation {
  tradeCount: number;
  score: number;
  tier: "none" | "low" | "medium" | "high";
  badge: string | null;
  highValueAllowed: boolean;
}

export interface MarketplaceListing {
  id: string;
  sellerAgentId: number;
  sellerTitle: string;
  rigId: number;
  rigTier: number;
  price: string;
  status: "active" | "sold" | "cancelled";
  listedAt: number;
  buyerAgentId?: number;
  soldAt?: number;
  sellerReputation?: TradeReputation;
}

export interface MarketplaceSale {
  listingId: string;
  sellerAgentId: number;
  buyerAgentId: number;
  rigTier: number;
  price: string;
  burned: string;
  timestamp: number;
  sellerReputation?: TradeReputation;
  buyerReputation?: TradeReputation;
}

export interface DynamicPrice {
  tier: number;
  baseCost: string;
  effectiveCost: string;
  totalOwned: number;
  timestamp: number;
}

export interface OTCOffer {
  id: string;
  agentId: number;
  agentTitle: string;
  type: "sell_chaos" | "buy_chaos";
  chaosAmount: string;
  monPrice: string;
  status: "active" | "accepted" | "completed" | "cancelled";
  counterpartyAgentId?: number;
  counterpartyTitle?: string;
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  reputation: TradeReputation;
}

export interface MarketplaceStats {
  activeListings: number;
  totalSales: number;
  totalVolume: string;
  totalBurned: string;
  salesByTier: Record<number, number>;
  topTraders: { agentId: number; tradeCount: number }[];
  otc?: {
    activeOffers: number;
    completedTrades: number;
  };
}

export function useMarketplace() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [sales, setSales] = useState<MarketplaceSale[]>([]);
  const [prices, setPrices] = useState<DynamicPrice[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [otcOffers, setOtcOffers] = useState<OTCOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [listingsRes, salesRes, pricesRes, statsRes, otcRes] = await Promise.all([
        fetch(`${API_URL}/api/marketplace/listings?count=20`),
        fetch(`${API_URL}/api/marketplace/sales?count=10`),
        fetch(`${API_URL}/api/marketplace/prices`),
        fetch(`${API_URL}/api/marketplace/stats`),
        fetch(`${API_URL}/api/marketplace/otc/offers?status=all&count=20`),
      ]);

      if (listingsRes.ok) {
        const data = await listingsRes.json();
        setListings(data.listings || []);
      }
      if (salesRes.ok) {
        const data = await salesRes.json();
        setSales(data.sales || []);
      }
      if (pricesRes.ok) {
        const data = await pricesRes.json();
        setPrices(data.prices || []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (otcRes.ok) {
        const data = await otcRes.json();
        setOtcOffers(data.offers || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 12_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { listings, sales, prices, stats, otcOffers, loading };
}
