"use client";

import { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { HEX_RADIUS, HEX_HEIGHT } from "./hex-geometry";
import type { ZoneData } from "./types";

const HOVER_LIFT = 0.35;
const SELECT_LIFT = 0.65;

interface ZonePlatformProps {
  zone: ZoneData;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}

export default function ZonePlatform({
  zone,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: ZonePlatformProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const sideMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const rimMatRef = useRef<THREE.MeshBasicMaterial>(null!);

  // Load zone image as texture
  const texture = useLoader(THREE.TextureLoader, zone.image);

  // Target Y position (base + hover/select lift)
  const targetY = zone.position.y + (isSelected ? SELECT_LIFT : isHovered ? HOVER_LIFT : 0);

  // Emissive intensity scales with hashrate share
  const baseEmissive = 0.15 + zone.hashShare * 2.5;

  // Shared hex prism geometry (CylinderGeometry with 6 segments = hexagon)
  const prismGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(HEX_RADIUS, HEX_RADIUS, HEX_HEIGHT, 6);
    geo.rotateY(Math.PI / 6); // Flat-top orientation
    return geo;
  }, []);

  // Top face hex (slightly smaller, for zone image)
  const topGeo = useMemo(() => {
    const geo = new THREE.CircleGeometry(HEX_RADIUS * 0.96, 6);
    return geo;
  }, []);

  // Rim ring geometry
  const rimGeo = useMemo(() => {
    return new THREE.RingGeometry(HEX_RADIUS * 0.94, HEX_RADIUS * 1.03, 6);
  }, []);

  const zoneColor = useMemo(() => new THREE.Color(zone.color), [zone.color]);

  // Animate position smoothly + breathing pulse
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Smooth Y lerp
    const currentY = groupRef.current.position.y;
    groupRef.current.position.y = THREE.MathUtils.lerp(
      currentY,
      targetY,
      1 - Math.pow(0.003, delta),
    );

    // Breathing emissive pulse
    if (sideMatRef.current && zone.agentCount > 0) {
      const breatheSpeed = zone.agentCount > 3 ? 2.0 : zone.agentCount > 1 ? 1.2 : 0.8;
      const pulse = Math.sin(performance.now() * 0.001 * breatheSpeed) * 0.3 + 0.7;
      sideMatRef.current.emissiveIntensity = baseEmissive * pulse;
    }

    // Rim opacity pulse
    if (rimMatRef.current) {
      const targetOpacity = isSelected ? 0.9 : isHovered ? 0.7 : 0.15 + zone.hashShare * 0.35;
      rimMatRef.current.opacity = THREE.MathUtils.lerp(
        rimMatRef.current.opacity,
        targetOpacity,
        1 - Math.pow(0.01, delta),
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={[zone.position.x, zone.position.y, zone.position.z]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerEnter={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = "pointer"; }}
      onPointerLeave={() => { onHover(false); document.body.style.cursor = "default"; }}
    >
      {/* Main hex prism — sides */}
      <mesh geometry={prismGeo}>
        <meshStandardMaterial
          ref={sideMatRef}
          color={zone.color}
          transparent
          opacity={isSelected ? 0.7 : isHovered ? 0.5 : 0.25}
          emissive={zoneColor}
          emissiveIntensity={baseEmissive}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>

      {/* Top face — zone image texture */}
      <mesh
        geometry={topGeo}
        position={[0, HEX_HEIGHT / 2 + 0.002, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 6]}
      >
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={isSelected ? 0.75 : isHovered ? 0.6 : 0.4}
          emissive={zoneColor}
          emissiveIntensity={0.08}
          roughness={0.6}
        />
      </mesh>

      {/* Dark overlay on top face (matches SVG scrim) */}
      <mesh
        position={[0, HEX_HEIGHT / 2 + 0.004, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 6]}
      >
        <circleGeometry args={[HEX_RADIUS * 0.96, 6]} />
        <meshBasicMaterial
          color="#06080D"
          transparent
          opacity={isSelected ? 0.08 : isHovered ? 0.15 : 0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Rim glow ring */}
      <mesh
        geometry={rimGeo}
        position={[0, HEX_HEIGHT / 2 + 0.006, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 6]}
      >
        <meshBasicMaterial
          ref={rimMatRef}
          color={zone.color}
          transparent
          opacity={0.2 + zone.hashShare * 0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
