"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ZoneParticlesProps {
  position: THREE.Vector3;
  agentCount: number;
  zoneIndex: number;
  color: string;
  maxParticles?: number;
}

export default function ZoneParticles({
  position,
  agentCount,
  zoneIndex,
  color,
  maxParticles = 6,
}: ZoneParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = Math.min(agentCount, maxParticles);

  // Deterministic particle seeds (matching SVG logic from ZoneMap.tsx)
  const particleData = useMemo(() => {
    const data: { x: number; z: number; y: number; speed: number; drift: number; delay: number }[] = [];
    for (let j = 0; j < count; j++) {
      const seed = zoneIndex * 100 + j;
      const angle = ((seed * 137.5) % 360) * (Math.PI / 180);
      const dist = (12 + (seed * 7.3 % 30)) * 0.04; // Scale to world units
      data.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        y: 0.25 + j * 0.12,
        speed: 3 + (seed % 4),
        drift: (4 + (seed % 6)) * 0.06,
        delay: (j * 0.6) % 4,
      });
    }
    return data;
  }, [count, zoneIndex]);

  const initialPositions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    particleData.forEach((p, i) => {
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
    });
    return pos;
  }, [particleData, count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current || count === 0) return;
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const t = clock.elapsedTime;
    particleData.forEach((p, i) => {
      const phase = t / p.speed + p.delay;
      posArray[i * 3 + 1] = p.y + Math.sin(phase * Math.PI * 2) * p.drift;
    });
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <group position={position}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[initialPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.1}
          sizeAttenuation
          transparent
          opacity={0.55}
          color={color}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
