"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ZoneData } from "./types";

interface CameraControllerProps {
  selectedZone: number | null;
  zones: ZoneData[];
}

const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
const DEFAULT_POSITION = new THREE.Vector3(0, 8, 12);
const FOCUS_DISTANCE = 6;
const FOCUS_HEIGHT = 4;
const AUTO_ROTATE_SPEED = 0.25;
const IDLE_TIMEOUT = 6000;

export default function CameraController({ selectedZone, zones }: CameraControllerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const lastInteraction = useRef(performance.now());
  const targetPosition = useRef(new THREE.Vector3().copy(DEFAULT_POSITION));
  const targetLookAt = useRef(new THREE.Vector3().copy(DEFAULT_TARGET));
  const isAnimating = useRef(false);

  // When a zone is selected, animate camera to focus on it
  useEffect(() => {
    if (selectedZone !== null && zones[selectedZone]) {
      const zone = zones[selectedZone];
      targetLookAt.current.copy(zone.position);
      targetPosition.current.set(
        zone.position.x + FOCUS_DISTANCE * 0.3,
        zone.position.y + FOCUS_HEIGHT,
        zone.position.z + FOCUS_DISTANCE,
      );
      isAnimating.current = true;
    } else {
      targetLookAt.current.copy(DEFAULT_TARGET);
      targetPosition.current.copy(DEFAULT_POSITION);
      isAnimating.current = true;
    }
  }, [selectedZone, zones]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    // Smooth camera animation when focusing/unfocusing
    if (isAnimating.current) {
      camera.position.lerp(targetPosition.current, 1 - Math.pow(0.008, delta));
      controlsRef.current.target.lerp(targetLookAt.current, 1 - Math.pow(0.008, delta));
      controlsRef.current.update();

      if (camera.position.distanceTo(targetPosition.current) < 0.05) {
        isAnimating.current = false;
      }
    }

    // Auto-rotate when idle
    const idle = performance.now() - lastInteraction.current > IDLE_TIMEOUT;
    if (controlsRef.current.autoRotate !== undefined) {
      controlsRef.current.autoRotate = idle && selectedZone === null;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      autoRotateSpeed={AUTO_ROTATE_SPEED}
      minDistance={4}
      maxDistance={25}
      maxPolarAngle={Math.PI * 0.45}
      minPolarAngle={Math.PI * 0.1}
      onStart={() => {
        lastInteraction.current = performance.now();
        isAnimating.current = false;
      }}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    />
  );
}
