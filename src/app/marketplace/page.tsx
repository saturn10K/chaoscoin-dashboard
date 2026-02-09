"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useChainData } from "../../hooks/useChainData";
import HeaderBar from "../../components/HeaderBar";

const MarketplacePanel = dynamic(() => import("../../components/MarketplacePanel"), { ssr: false });

export default function MarketplacePage() {
  const { data } = useChainData();

  return (
    <div className="min-h-screen" style={{ background: "#06080D url('/assets/dark_space.png') center/cover fixed" }}>
      <HeaderBar
        era={data?.currentEra ?? 1}
        agentCount={data?.activeAgentCount ?? 0}
        totalBurned={data?.totalBurned ?? "0"}
        lastEventBlock={data?.lastEventBlock ?? "0"}
        eventCooldown={data?.eventCooldown ?? 75000}
      />

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link
            href="/"
            className="hover:text-gray-300 transition-colors"
            style={{ color: "#7B61FF" }}
          >
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-400">Rig Marketplace</span>
        </div>

        <MarketplacePanel />
      </div>
    </div>
  );
}
