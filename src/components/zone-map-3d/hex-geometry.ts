import { Vector3 } from "three";

// ── Original SVG hex grid constants ────────────────────────────────────
const S = 56;
const HEX_H = Math.sqrt(3) * S;
const COL_STEP = 1.5 * S;
const ROW_STEP = HEX_H;

// Grid layout: [col, row] per zone index
// Zone 0:[0,0] 1:[2,0] 2:[1,0] 3:[3,0] 4:[0,1] 5:[2,1] 6:[1,1] 7:[3,1]
const GRID: [number, number][] = [
  [0, 0], [2, 0], [1, 0], [3, 0],
  [0, 1], [2, 1], [1, 1], [3, 1],
];

// 13 adjacency edges between neighboring zones
export const ADJACENCY: [number, number][] = [
  [0, 2], [2, 1], [1, 3], [0, 6], [2, 4], [2, 6],
  [2, 5], [3, 5], [3, 7], [1, 7], [4, 6], [6, 5], [5, 7],
];

// ── Convert SVG grid → 3D world positions ─────────────────────────────
const SCALE = 0.055; // SVG units → world units
const Y_OFFSETS = [0, 0.3, -0.2, 0.5, -0.1, 0.4, 0.15, -0.3];

function computePositions(): Vector3[] {
  const svgPositions = GRID.map(([col, row]) => ({
    x: col * COL_STEP,
    y: row * ROW_STEP + (col % 2 === 1 ? HEX_H / 2 : 0),
  }));

  // Center the grid at the origin
  const centerX = svgPositions.reduce((s, p) => s + p.x, 0) / svgPositions.length;
  const centerY = svgPositions.reduce((s, p) => s + p.y, 0) / svgPositions.length;

  return svgPositions.map((p, i) =>
    new Vector3(
      (p.x - centerX) * SCALE,
      Y_OFFSETS[i],
      (p.y - centerY) * SCALE,
    ),
  );
}

export const HEX_WORLD_POSITIONS: Vector3[] = computePositions();

// ── Hex platform constants ─────────────────────────────────────────────
export const HEX_RADIUS = 2.2;
export const HEX_HEIGHT = 0.18;
