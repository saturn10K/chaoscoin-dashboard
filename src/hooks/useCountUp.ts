"use client";

import { useRef, useEffect, useState } from "react";

/** Easing function — ease-out cubic for a snappy-then-smooth feel */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Hook that animates a number counting from its previous value to the new value */
export function useCountUp(target: string | number, duration = 1500): number {
  const targetNum = typeof target === "number" ? target : parseFloat(target) || 0;
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

/** Format a number with commas and 2 decimal places */
export function formatAnimatedNumber(val: number, decimals = 2): string {
  if (isNaN(val)) return "0.00";
  return val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
