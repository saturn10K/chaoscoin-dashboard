export const ZONE_NAMES = [
  "The Solar Flats",
  "The Graviton Fields",
  "The Dark Forest",
  "The Nebula Depths",
  "The Kuiper Expanse",
  "The Trisolaran Reach",
  "The Pocket Rim",
  "The Singer Void",
] as const;

export const ZONE_COLORS = [
  "#FFA500", // Solar Flats — orange
  "#9B59B6", // Graviton Fields — purple
  "#1A1A2E", // Dark Forest — dark
  "#3498DB", // Nebula Depths — blue
  "#2ECC71", // Kuiper Expanse — green
  "#E74C3C", // Trisolaran Reach — red
  "#F39C12", // Pocket Rim — gold
  "#7F8C8D", // Singer Void — grey
] as const;

export const ZONE_MODIFIERS = [
  "+15%", "-10%", "+0%", "+10%", "+5%", "+5%", "+8%", "+3%",
] as const;

export const ZONE_RISK = [
  "Low",       // Solar Flats
  "Low",       // Graviton Fields
  "Medium",    // Dark Forest
  "Medium",    // Nebula Depths
  "Low",       // Kuiper Expanse
  "High",      // Trisolaran Reach
  "Medium",    // Pocket Rim
  "Very High", // Singer Void
] as const;

export const ZONE_DESCRIPTIONS = [
  "Sun-baked plains with consistent energy output. A safe zone with solid hashrate bonuses for steady miners.",
  "Swirling gravity wells that harden equipment against cosmic interference. Ideal for defensive strategies.",
  "The default frontier. Balanced conditions with no modifiers — a blank canvas for any strategy.",
  "Dense stellar clouds rich with harvestable particles. Modest reward bonuses for patient miners.",
  "Frozen outer reaches where equipment degrades slower. Perfect for long-duration rig deployments.",
  "Volatile three-body region. Extreme hashrate bonuses offset by reduced cosmic resilience.",
  "A sheltered gravitational pocket. Shield-amplifying properties make it the fortress-builder's zone.",
  "The edge of known space. Maximum reward potential but punishing cosmic event frequency.",
] as const;

export const ZONE_BONUS_DETAIL = [
  "+15% hashrate",
  "-10% hashrate, +15% cosmic resilience",
  "No modifiers",
  "+10% mining rewards",
  "+5% hashrate, -5% rig degradation",
  "+5% hashrate, -10% cosmic resilience",
  "+8% hashrate, +12% shield strength",
  "+3% hashrate, +25% rewards, high event risk",
] as const;

export const ERA_NAMES = ["Era I: The Calm Before", "Era II: First Contact"] as const;

export const EVENT_TYPES = [
  { name: "Solar Breeze", tier: 1, color: "#48BB78" },
  { name: "Cosmic Dust Cloud", tier: 1, color: "#48BB78" },
  { name: "Sophon Surveillance Pulse", tier: 2, color: "#ECC94B" },
  { name: "Gravity Wave Oscillation", tier: 2, color: "#ECC94B" },
  { name: "Dark Forest Strike", tier: 3, color: "#ED8936" },
  { name: "Solar Flare Cascade", tier: 3, color: "#ED8936" },
] as const;

export const TIER_COLORS = {
  1: "#48BB78",
  2: "#ECC94B",
  3: "#ED8936",
} as const;

export const RIG_NAMES = [
  "Potato Rig",
  "Scrapheap Engine",
  "Windmill Cracker",
  "Magma Core",
  "Neutrino Sieve",
] as const;

export const FACILITY_NAMES = [
  "The Burrow",
  "Faraday Cage",
  "The Bunker",
] as const;

export const SHIELD_NAMES = [
  "None",
  "Magnetic Deflector",
  "EM Barrier",
] as const;

export const RIG_TIER_COLORS = [
  "#6B7280", // T0 gray
  "#48BB78", // T1 green
  "#3498DB", // T2 blue
  "#ECC94B", // T3 gold
  "#FF6B35", // T4 orange
] as const;

// ─── Asset Paths ──────────────────────────────────────────────────────

export const ZONE_IMAGES = [
  "/assets/zones/solar_flats.png",
  "/assets/zones/graviton.png",
  "/assets/zones/dark_forest_space.png",
  "/assets/zones/nebula_depths.png",
  "/assets/zones/kuiper_expanse.png",
  "/assets/zones/trisolarian_reach.png",
  "/assets/zones/pocket_rim.png",
  "/assets/zones/singer_void.png",
] as const;

export const RIG_IMAGES = [
  "/assets/rigs/potato-rig.png",
  "/assets/rigs/scrapheap.png",
  "/assets/rigs/windmill.png",
  "/assets/rigs/magma-rig.png",
  "/assets/rigs/neutrino-rig.png",
] as const;

export const FACILITY_IMAGES = [
  "/assets/facilities/the_burrow.png",
  "/assets/facilities/faraday.png",
  "/assets/facilities/reinforced_bunker.png",
] as const;

export const SHIELD_IMAGES: (string | null)[] = [
  null,
  "/assets/icons/magnetic_shield.png",
  "/assets/icons/electromagnetic_shield.png",
];

export const EVENT_ICONS = [
  "/assets/icons/solar_breeze.png",
  "/assets/icons/cosmic_dust.png",
  "/assets/icons/sophon.png",
  "/assets/icons/gravity_wave.png",
  "/assets/icons/dark_forest.png",
  "/assets/icons/solar_flare.png",
] as const;

export const PIONEER_BADGES: (string | null)[] = [
  null,
  "/assets/badges/founding_miner_badge.png",
  "/assets/badges/early_adopter_badge.png",
  "/assets/badges/trailblazer_badge.png",
];

export const ICONS = {
  hashrate: "/assets/icons/hashrate_indicator_green.png",
  burn: "/assets/icons/token_burn.png",
  shield: "/assets/icons/shield_icon.png",
  facility: "/assets/icons/facility.png",
  zone: "/assets/icons/zone_icon.png",
  cosmicWarning: "/assets/icons/cosmic_event_warning.png",
  logo: "/assets/logos/logo.png",
  favicon: "/assets/logos/favicon.png",
} as const;
