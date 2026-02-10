"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

function formatNumber(val: string): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface HeaderBarProps {
  era: number;
  agentCount: number;
  totalBurned: string;
  lastEventBlock: string;
  eventCooldown: number;
  currentPath?: string;
}

export default function HeaderBar({
  era,
  agentCount,
  totalBurned,
  lastEventBlock,
  eventCooldown,
  currentPath = "/",
}: HeaderBarProps) {
  const burnRef = useRef<HTMLSpanElement>(null);
  const prevBurnedRef = useRef<string>(totalBurned);

  useEffect(() => {
    if (prevBurnedRef.current !== totalBurned && burnRef.current) {
      burnRef.current.classList.remove("animate-pulse-burn");
      void burnRef.current.offsetWidth;
      burnRef.current.classList.add("animate-pulse-burn");
    }
    prevBurnedRef.current = totalBurned;
  }, [totalBurned]);

  const eraLabel = era === 0 ? "Era I" : "Era II";
  const eraColor = era === 0 ? "#7B61FF" : "#FF6B35";

  return (
    <>
      <style>{`
        @keyframes pulseBurn {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.08); filter: brightness(1.4); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        .animate-pulse-burn {
          animation: pulseBurn 0.4s ease-out;
        }
      `}</style>
      <header
        className="flex flex-wrap items-center justify-between px-3 sm:px-4 gap-y-1 border-b border-white/10"
        style={{
          minHeight: 48,
          backgroundColor: "#06080D",
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/">
            <img
              src="/assets/logos/logo.png"
              alt="Chaoscoin"
              className="h-6 sm:h-[30px] cursor-pointer transition-transform hover:scale-105"
              style={{ filter: "brightness(1.1)" }}
            />
          </Link>

          {/* Era Badge */}
          <span
            className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap"
            style={{
              backgroundColor: `${eraColor}20`,
              color: eraColor,
              border: `1px solid ${eraColor}40`,
            }}
          >
            {eraLabel}
          </span>

          {/* Marketplace link */}
          <Link
            href="/marketplace"
            className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors hover:brightness-125 btn-press"
            style={{
              backgroundColor: currentPath === "/marketplace" ? "#00D4FF30" : "#00D4FF15",
              color: "#00D4FF",
              border: currentPath === "/marketplace" ? "1px solid #00D4FF70" : "1px solid #00D4FF30",
              boxShadow: currentPath === "/marketplace" ? "0 0 8px #00D4FF30" : "none",
            }}
          >
            Marketplace
          </Link>

          {/* Mine link */}
          <Link
            href="/mine"
            className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors hover:brightness-125 btn-press"
            style={{
              backgroundColor: currentPath === "/mine" ? "#00E5A030" : "#00E5A015",
              color: "#00E5A0",
              border: currentPath === "/mine" ? "1px solid #00E5A070" : "1px solid #00E5A030",
              boxShadow: currentPath === "/mine" ? "0 0 8px #00E5A030" : "none",
            }}
          >
            Mine
          </Link>

          {/* Trade link */}
          <Link
            href="/trade"
            className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors hover:brightness-125 btn-press"
            style={{
              backgroundColor: currentPath === "/trade" ? "#FF9D3D30" : "#FF9D3D15",
              color: "#FF9D3D",
              border: currentPath === "/trade" ? "1px solid #FF9D3D70" : "1px solid #FF9D3D30",
              boxShadow: currentPath === "/trade" ? "0 0 8px #FF9D3D30" : "none",
            }}
          >
            Trade
          </Link>
        </div>

        {/* Metrics — scrollable on mobile, normal on desktop */}
        <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm overflow-x-auto scrollbar-hide">
          {/* Active Agents */}
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0">
            <span
              className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
              style={{ backgroundColor: "#00E5A0" }}
            />
            <span className="text-gray-400 hidden sm:inline">Agents</span>
            <span
              className="font-semibold"
              style={{ color: "#00E5A0", fontFamily: "monospace" }}
            >
              {agentCount.toLocaleString()}
            </span>
          </div>

          {/* Burn Counter */}
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0">
            <img src="/assets/icons/token_burn.png" alt="" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-gray-400 hidden sm:inline">Burned</span>
            <span
              ref={burnRef}
              className="font-semibold animate-number-flash"
              style={{ color: "#FF6B35", fontFamily: "monospace" }}
            >
              {formatNumber(totalBurned)}
            </span>
          </div>

          {/* Event Cooldown */}
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0">
            <img src="/assets/icons/cosmic_event_warning.png" alt="" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-gray-400 hidden sm:inline">Next</span>
            <span
              className="font-semibold"
              style={{ color: "#7B61FF", fontFamily: "monospace" }}
            >
              {eventCooldown > 0 ? `${eventCooldown}b` : "READY"}
            </span>
          </div>
        </div>
      </header>
    </>
  );
}
