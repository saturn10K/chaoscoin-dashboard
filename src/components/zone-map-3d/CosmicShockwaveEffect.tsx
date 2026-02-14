"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CosmicShockwave3D, ZoneData } from "./types";

const TIER_COLORS: Record<number, string> = {
  1: "#00E5A0",
  2: "#ECC94B",
  3: "#FF4444",
};
const DURATION = 2.0;

interface CosmicShockwaveEffectProps {
  shockwave: CosmicShockwave3D | null;
  zones: ZoneData[];
}

export default function CosmicShockwaveEffect({ shockwave, zones }: CosmicShockwaveEffectProps) {
  if (!shockwave) return null;
  const zone = zones[shockwave.zone];
  if (!zone) return null;

  return (
    <ShockwaveRing
      key={`shock-${shockwave.id}`}
      center={zone.position}
      color={TIER_COLORS[shockwave.tier] || "#7B61FF"}
      tier={shockwave.tier}
    />
  );
}

function ShockwaveRing({
  center,
  color,
  tier,
}: {
  center: THREE.Vector3;
  color: string;
  tier: number;
}) {
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const startTime = useRef(performance.now());

  useFrame(() => {
    const elapsed = (performance.now() - startTime.current) / 1000;
    const t = Math.min(elapsed / DURATION, 1);

    // First ring — expands outward
    if (ring1Ref.current) {
      const scale = 1 + t * 8;
      ring1Ref.current.scale.set(scale, scale, scale);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.8;
    }

    // Second ring (delayed) — for higher severity
    if (ring2Ref.current && tier >= 2) {
      const t2 = Math.max(0, (elapsed - 0.3) / (DURATION - 0.3));
      const scale = 1 + Math.min(t2, 1) * 6;
      ring2Ref.current.scale.set(scale, scale, scale);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - Math.min(t2, 1)) * 0.5;
    }
  });

  return (
    <group position={center}>
      {/* Primary shockwave ring */}
      <mesh ref={ring1Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.9, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Secondary ring (tier >= 2) */}
      {tier >= 2 && (
        <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.65, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
