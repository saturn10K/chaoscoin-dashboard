import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://chaoscoin-production.up.railway.app";

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
}

export interface MarketplaceSale {
  listingId: string;
  sellerAgentId: number;
  buyerAgentId: number;
  rigTier: number;
  price: string;
  burned: string;
  timestamp: number;
}

export interface DynamicPrice {
  tier: number;
  baseCost: string;
  effectiveCost: string;
  totalOwned: number;
  timestamp: number;
}

export interface MarketplaceStats {
  activeListings: number;
  totalSales: number;
  totalVolume: string;
  totalBurned: string;
  salesByTier: Record<number, number>;
  topTraders: { agentId: number; tradeCount: number }[];
}

export function useMarketplace() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [sales, setSales] = useState<MarketplaceSale[]>([]);
  const [prices, setPrices] = useState<DynamicPrice[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [listingsRes, salesRes, pricesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/marketplace/listings?count=20`),
        fetch(`${API_URL}/api/marketplace/sales?count=10`),
        fetch(`${API_URL}/api/marketplace/prices`),
        fetch(`${API_URL}/api/marketplace/stats`),
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
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 12_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { listings, sales, prices, stats, loading };
}
