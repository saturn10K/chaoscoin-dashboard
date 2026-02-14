"use client";

import { Html, Billboard } from "@react-three/drei";
import { HEX_HEIGHT } from "./hex-geometry";
import type { ZoneData } from "./types";

interface ZoneLabelProps {
  zone: ZoneData;
  isSelected: boolean;
  isHovered: boolean;
}

export default function ZoneLabel({ zone, isSelected, isHovered }: ZoneLabelProps) {
  const active = isSelected || isHovered;

  const modifierColor =
    zone.modifier.startsWith("+") && zone.modifier !== "+0%"
      ? "#00E5A0"
      : zone.modifier.startsWith("-")
      ? "#FF6B35"
      : "#6B7280";

  return (
    <Billboard
      position={[zone.position.x, zone.position.y + HEX_HEIGHT / 2 + 0.9, zone.position.z]}
      follow
      lockX={false}
      lockY={false}
      lockZ={false}
    >
      <Html
        center
        distanceFactor={7}
        style={{
          pointerEvents: "none",
          userSelect: "none",
          transition: "transform 0.2s ease",
          transform: active ? "scale(1.1)" : "scale(1)",
        }}
      >
        <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>
          {/* Agent count */}
          <div
            style={{
              color: zone.color,
              fontSize: active ? 20 : 17,
              fontWeight: "bold",
              fontFamily: "monospace",
              textShadow: `0 0 8px ${zone.color}60`,
              transition: "font-size 0.2s ease",
              lineHeight: 1.1,
            }}
          >
            {zone.agentCount}
          </div>

          {/* Zone name */}
          <div
            style={{
              color: `${zone.color}CC`,
              fontSize: 10,
              fontFamily: "monospace",
              fontWeight: active ? 600 : 400,
              lineHeight: 1.3,
            }}
          >
            {zone.name.replace("The ", "")}
          </div>

          {/* Modifier */}
          <div
            style={{
              color: modifierColor,
              fontSize: 9,
              fontWeight: "bold",
              fontFamily: "monospace",
              lineHeight: 1.4,
            }}
          >
            {zone.modifier}
          </div>

          {/* Hashrate bar */}
          {zone.agentCount > 0 && (
            <div
              style={{
                margin: "2px auto 0",
                width: 40,
                height: 2,
                borderRadius: 1,
                backgroundColor: "rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max(5, zone.hashShare * 100)}%`,
                  height: "100%",
                  borderRadius: 1,
                  backgroundColor: zone.color,
                  opacity: 0.6,
                  transition: "width 0.8s ease",
                }}
              />
            </div>
          )}
        </div>
      </Html>
    </Billboard>
  );
}
