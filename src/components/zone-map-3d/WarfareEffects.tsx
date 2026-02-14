"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { WarfareLine3D, ZoneData } from "./types";

interface WarfareEffectsProps {
  lines: WarfareLine3D[];
  zones: ZoneData[];
}

export default function WarfareEffects({ lines, zones }: WarfareEffectsProps) {
  return (
    <group>
      {lines.map((line) => {
        const from = zones[line.fromZone];
        const to = zones[line.toZone];
        if (!from || !to) return null;
        return (
          <WarfareBolt
            key={`war-${line.id}`}
            start={from.position}
            end={to.position}
          />
        );
      })}
    </group>
  );
}

function WarfareBolt({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const boltRef = useRef<THREE.Mesh>(null!);
  const startTime = useRef(performance.now());

  const points = useMemo(
    () => [
      [start.x, start.y, start.z] as [number, number, number],
      [end.x, end.y, end.z] as [number, number, number],
    ],
    [start, end],
  );

  useFrame(() => {
    if (!boltRef.current) return;
    const elapsed = (performance.now() - startTime.current) / 1000;
    const travelDuration = 1.5;
    const t = Math.min(elapsed / travelDuration, 1);

    // Lerp bolt position along path
    boltRef.current.position.lerpVectors(start, end, t);

    // Scale bolt (bigger in middle of travel)
    const scale = 1 + Math.sin(t * Math.PI) * 0.5;
    boltRef.current.scale.setScalar(scale);

    // Fade after arrival
    const mat = boltRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = t >= 1 ? Math.max(0, 1 - (elapsed - travelDuration) * 1.5) : 1;
  });

  return (
    <group>
      {/* Bolt projectile */}
      <mesh ref={boltRef} position={start.clone()}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#FF4444" transparent opacity={1} />
      </mesh>

      {/* Trail line using drei Line (avoids SVG type conflict) */}
      <Line
        points={points}
        color="#FF4444"
        lineWidth={1.5}
        transparent
        opacity={0.4}
      />
    </group>
  );
}
