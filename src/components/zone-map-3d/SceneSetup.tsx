"use client";

export default function SceneSetup() {
  return (
    <>
      {/* Subtle ambient for baseline visibility */}
      <ambientLight intensity={0.12} color="#4466aa" />

      {/* Main directional light — highlights from top-right */}
      <directionalLight position={[5, 10, 5]} intensity={0.35} color="#ffffff" />

      {/* Point light from below — dramatic under-glow */}
      <pointLight position={[0, -4, 0]} intensity={0.15} color="#7B61FF" />

      {/* Fog for depth — objects fade at distance */}
      <fog attach="fog" args={["#06080D", 18, 55]} />

      {/* Dark background matching dashboard */}
      <color attach="background" args={["#0D1117"]} />
    </>
  );
}
