"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CosmicEvent } from "../hooks/useCosmicEvents";

interface CosmicFlashOverlayProps {
  cosmicEvents: CosmicEvent[];
}

const TIER_COLORS: Record<number, string> = {
  1: "#00E5A0",
  2: "#ECC94B",
  3: "#FF4444",
};

const FLASH_DURATION = 2500; // ms

export default function CosmicFlashOverlay({ cosmicEvents }: CosmicFlashOverlayProps) {
  const [flash, setFlash] = useState<{ tier: number; id: number } | null>(null);
  const lastEventIdRef = useRef<number>(0);
  const initializedRef = useRef(false);

  // Skip initial load
  useEffect(() => {
    if (cosmicEvents.length > 0) {
      lastEventIdRef.current = cosmicEvents[0].eventId;
    }
    const timer = setTimeout(() => { initializedRef.current = true; }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!initializedRef.current || cosmicEvents.length === 0) return;
    const latest = cosmicEvents[0];
    if (!latest || latest.eventId <= lastEventIdRef.current) return;
    lastEventIdRef.current = latest.eventId;

    setFlash({ tier: latest.severityTier, id: latest.eventId });
    const timer = setTimeout(() => setFlash(null), FLASH_DURATION);
    return () => clearTimeout(timer);
  }, [cosmicEvents]);

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key={`cosmic-flash-${flash.id}`}
          className="fixed inset-0 z-30 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Full screen color wash */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, flash.tier >= 3 ? 0.35 : flash.tier >= 2 ? 0.2 : 0.12, 0],
            }}
            transition={{ duration: FLASH_DURATION / 1000, ease: "easeOut" }}
            style={{
              background: `radial-gradient(ellipse at center, ${TIER_COLORS[flash.tier] || "#7B61FF"}40, transparent 70%)`,
            }}
          />

          {/* Expanding shockwave ring */}
          <motion.div
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              translateX: "-50%",
              translateY: "-50%",
              border: `2px solid ${TIER_COLORS[flash.tier] || "#7B61FF"}`,
              borderRadius: "50%",
            }}
            initial={{ width: 0, height: 0, opacity: 0.8 }}
            animate={{
              width: "150vmax",
              height: "150vmax",
              opacity: 0,
            }}
            transition={{
              duration: 1.8,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          />

          {/* Second shockwave (delayed) */}
          {flash.tier >= 2 && (
            <motion.div
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                translateX: "-50%",
                translateY: "-50%",
                border: `1px solid ${TIER_COLORS[flash.tier] || "#7B61FF"}`,
                borderRadius: "50%",
              }}
              initial={{ width: 0, height: 0, opacity: 0.5 }}
              animate={{
                width: "120vmax",
                height: "120vmax",
                opacity: 0,
              }}
              transition={{
                duration: 1.5,
                delay: 0.3,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            />
          )}

          {/* Center flash burst */}
          <motion.div
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              translateX: "-50%",
              translateY: "-50%",
              width: 4,
              height: 4,
              borderRadius: "50%",
              backgroundColor: TIER_COLORS[flash.tier] || "#7B61FF",
            }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{
              scale: [1, 60, 80],
              opacity: [1, 0.6, 0],
            }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          {/* Screen shake via CSS (applied to body) */}
          {flash.tier >= 3 && (
            <motion.div
              className="absolute inset-0"
              animate={{
                x: [0, -3, 3, -2, 2, -1, 1, 0],
                y: [0, 2, -2, 1, -1, 0.5, -0.5, 0],
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
