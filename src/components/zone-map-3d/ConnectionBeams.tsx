"use client";

import { Line } from "@react-three/drei";
import { ADJACENCY } from "./hex-geometry";
import type { ZoneData } from "./types";

interface ConnectionBeamsProps {
  zones: ZoneData[];
  selectedZone: number | null;
  hoveredZone: number | null;
}

export default function ConnectionBeams({ zones, selectedZone, hoveredZone }: ConnectionBeamsProps) {
  return (
    <group>
      {ADJACENCY.map(([a, b]) => {
        const za = zones[a];
        const zb = zones[b];
        if (!za || !zb) return null;

        const aHot = a === selectedZone || a === hoveredZone;
        const bHot = b === selectedZone || b === hoveredZone;
        const hot = aHot || bHot;
        const color = hot ? (aHot ? za.color : zb.color) : "#7B61FF";
        const opacity = hot ? 0.35 : 0.05;
        const lineWidth = hot ? 2 : 0.5;

        return (
          <Line
            key={`beam-${a}-${b}`}
            points={[
              [za.position.x, za.position.y, za.position.z],
              [zb.position.x, zb.position.y, zb.position.z],
            ]}
            color={color}
            lineWidth={lineWidth}
            transparent
            opacity={opacity}
          />
        );
      })}
    </group>
  );
}
