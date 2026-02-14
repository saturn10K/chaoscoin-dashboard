"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ActivityBurst3D, ZoneData } from "./types";

interface ActivityBurstsProps {
  sparks: ActivityBurst3D[];
  zones: ZoneData[];
}

export default function ActivityBursts({ sparks, zones }: ActivityBurstsProps) {
  return (
    <group>
      {sparks.map((spark) => {
        const zone = zones[spark.zone];
        if (!zone) return null;
        return (
          <ParticleBurst
            key={spark.id}
            position={zone.position}
            color={spark.color}
          />
        );
      })}
    </group>
  );
}

const PARTICLE_COUNT = 18;
const BURST_DURATION = 1.5;

function ParticleBurst({ position, color }: { position: THREE.Vector3; color: string }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const startTime = useRef(performance.now());

  const velocities = useMemo(() => {
    const vels: THREE.Vector3[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.8 + Math.random() * 1.8;
      vels.push(
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.abs(Math.sin(phi) * Math.sin(theta)) * speed * 0.7 + 0.3, // upward bias
          Math.cos(phi) * speed,
        ),
      );
    }
    return vels;
  }, []);

  const initialPositions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const elapsed = (performance.now() - startTime.current) / 1000;
    const t = Math.min(elapsed / BURST_DURATION, 1);

    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArray[i * 3] = velocities[i].x * t;
      posArray[i * 3 + 1] = velocities[i].y * t;
      posArray[i * 3 + 2] = velocities[i].z * t;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - t);
  });

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
          size={0.12}
          sizeAttenuation
          transparent
          opacity={1}
          color={color}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
