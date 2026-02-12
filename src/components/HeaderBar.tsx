"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useCountUp, formatAnimatedNumber } from "../hooks/useCountUp";

interface HeaderBarProps {
  era: number;
  agentCount: number;
  totalBurned: string;
  lastEventBlock: string;
  eventCooldown: number;
  currentPath?: string;
  networkStatus?: { lastRpcSuccess: number; error: string | null };
}

function NetworkDot({ status }: { status?: { lastRpcSuccess: number; error: string | null } }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(i);
  }, []);

  if (!status) return null;

  const age = status.lastRpcSuccess > 0 ? (now - status.lastRpcSuccess) / 1000 : Infinity;
  const hasError = !!status.error;

  let color = "#00E5A0"; // green
  let label = "Live";
  if (age > 60 || (hasError && age > 30)) {
    color = "#FF6B35";
    label = "Offline";
  } else if (age > 15 || hasError) {
    color = "#ECC94B";
    label = "Delayed";
  }

  const tooltip = status.lastRpcSuccess > 0
    ? `RPC: ${Math.floor(age)}s ago${hasError ? " | Error: " + status.error : ""}`
    : "Connecting...";

  return (
    <div
      className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0"
      title={tooltip}
    >
      <span
        className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}60`,
          animation: label === "Live" ? "pulse 2s ease-in-out infinite" : "none",
        }}
      />
      <span
        className="text-[10px] sm:text-xs font-medium hidden sm:inline"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}

export default function HeaderBar({
  era,
  agentCount,
  totalBurned,
  lastEventBlock,
  eventCooldown,
  currentPath = "/",
  networkStatus,
}: HeaderBarProps) {
  const burnRef = useRef<HTMLSpanElement>(null);
  const prevBurnedRef = useRef<string>(totalBurned);
  const animatedBurned = useCountUp(totalBurned, 1500);

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
          {/* Network Status */}
          <NetworkDot status={networkStatus} />

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
              {formatAnimatedNumber(animatedBurned)}
            </span>
          </div>

          {/* Cosmic Threat Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0">
            <img src="/assets/icons/cosmic_event_warning.png" alt="" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 text-[10px] hidden sm:inline">Cosmic</span>
                <span
                  className="font-semibold text-[10px]"
                  style={{
                    color: eventCooldown === 0 ? "#FF4444" : eventCooldown < 25000 ? "#ECC94B" : "#7B61FF",
                    fontFamily: "monospace",
                  }}
                >
                  {eventCooldown > 0 ? `${eventCooldown.toLocaleString()}b` : "IMMINENT"}
                </span>
              </div>
              {/* Animated threat bar */}
              <div
                className="h-[3px] rounded-full overflow-hidden"
                style={{ width: 48, backgroundColor: "#161B22" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  animate={{
                    width: `${Math.max(2, ((75000 - eventCooldown) / 75000) * 100)}%`,
                    backgroundColor:
                      eventCooldown === 0
                        ? "#FF4444"
                        : eventCooldown < 15000
                        ? "#FF6B35"
                        : eventCooldown < 37500
                        ? "#ECC94B"
                        : "#7B61FF",
                  }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  style={{
                    boxShadow:
                      eventCooldown === 0
                        ? "0 0 8px #FF444480"
                        : eventCooldown < 15000
                        ? "0 0 6px #FF6B3560"
                        : "none",
                  }}
                />
              </div>
            </div>
            {eventCooldown === 0 && (
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.5, 1],
                }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                style={{ boxShadow: "0 0 6px #FF4444" }}
              />
            )}
          </div>
        </div>
      </header>
    </>
  );
}
