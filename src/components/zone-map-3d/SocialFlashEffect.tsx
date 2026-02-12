"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HEX_RADIUS, HEX_HEIGHT } from "./hex-geometry";
import type { ZoneData } from "./types";

interface SocialFlashEffectProps {
  pulsingZones?: Set<number>;
  zones: ZoneData[];
}

export default function SocialFlashEffect({ pulsingZones, zones }: SocialFlashEffectProps) {
  if (!pulsingZones || pulsingZones.size === 0) return null;

  return (
    <group>
      {Array.from(pulsingZones).map((zoneIdx) => {
        const zone = zones[zoneIdx];
        if (!zone) return null;
        return (
          <FlashRing
            key={`flash-${zoneIdx}-${Date.now()}`}
            position={zone.position}
            color={zone.color}
          />
        );
      })}
    </group>
  );
}

function FlashRing({ position, color }: { position: THREE.Vector3; color: string }) {
  const ringRef = useRef<THREE.Mesh>(null!);
  const startTime = useRef(performance.now());

  useFrame(() => {
    if (!ringRef.current) return;
    const elapsed = (performance.now() - startTime.current) / 1000;
    const t = Math.min(elapsed / 1.5, 1);

    const scale = 1 + t * 0.4;
    ringRef.current.scale.set(scale, 1, scale);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.75;
  });

  return (
    <mesh
      ref={ringRef}
      position={[position.x, position.y + HEX_HEIGHT / 2 + 0.01, position.z]}
      rotation={[-Math.PI / 2, 0, Math.PI / 6]}
    >
      <ringGeometry args={[HEX_RADIUS * 0.9, HEX_RADIUS * 1.05, 6]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.75}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
