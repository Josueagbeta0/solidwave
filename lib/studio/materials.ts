import * as THREE from "three";

export type FinishGroup = "glass" | "liquid" | "metal" | "color";

export type Finish = {
  id: string;
  name: string;
  group: FinishGroup;
  color: string;
  metalness: number;
  roughness: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  dispersion?: number;
  attenuationColor?: string;
  attenuationDistance?: number;
  clearcoat?: number;
  iridescence?: number;
  iridescenceIOR?: number;
  envMapIntensity?: number;
  swatch: string;
};

const sphere = (light: string, base: string, dark: string) =>
  `radial-gradient(circle at 32% 26%, rgba(255,255,255,.98) 0, rgba(255,255,255,.55) 9%, rgba(255,255,255,0) 30%), radial-gradient(circle at 70% 80%, rgba(0,0,0,.35) 0, rgba(0,0,0,0) 48%), radial-gradient(circle at 50% 45%, ${base} 0, ${base} 48%, ${dark} 100%)`;

const glassSphere = (base: string, edge: string, glow = "rgba(255,255,255,.9)") =>
  `radial-gradient(circle at 30% 22%, ${glow} 0, rgba(255,255,255,.35) 10%, rgba(255,255,255,0) 34%), radial-gradient(circle at 66% 76%, rgba(0,0,0,.12) 0, rgba(0,0,0,0) 48%), radial-gradient(circle at 50% 50%, ${base} 0, ${base} 42%, ${edge} 100%)`;

export const finishes: Finish[] = [
  // Glass
  {
    id: "clear",
    name: "Clair",
    group: "glass",
    color: "#ffffff",
    metalness: 0,
    roughness: 0.04,
    transmission: 1,
    thickness: 5,
    ior: 1.52,
    attenuationColor: "#ffffff",
    attenuationDistance: 400,
    envMapIntensity: 1.2,
    swatch: glassSphere("#ffffff", "#cfd8e3"),
  },
  {
    id: "crystal",
    name: "Cristal",
    group: "glass",
    color: "#f4f8ff",
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    thickness: 8,
    ior: 1.8,
    attenuationColor: "#eef5ff",
    attenuationDistance: 300,
    iridescence: 0.18,
    iridescenceIOR: 1.4,
    envMapIntensity: 1.4,
    swatch: glassSphere("#f8fbff", "#c3d4ea", "rgba(214,236,255,.95)"),
  },
  {
    id: "frosted",
    name: "Givré",
    group: "glass",
    color: "#f7f8fa",
    metalness: 0,
    roughness: 0.42,
    transmission: 0.92,
    thickness: 6,
    ior: 1.5,
    attenuationColor: "#f1f3f6",
    attenuationDistance: 120,
    envMapIntensity: 0.6,
    swatch: glassSphere("#f7f8fa", "#d6dbe2"),
  },
  {
    id: "milk",
    name: "Lait",
    group: "glass",
    color: "#faf8f3",
    metalness: 0,
    roughness: 0.34,
    transmission: 0.72,
    thickness: 10,
    ior: 1.46,
    attenuationColor: "#f6efe3",
    attenuationDistance: 40,
    envMapIntensity: 0.55,
    swatch: glassSphere("#fbfaf6", "#e6dccb", "rgba(255,252,245,.95)"),
  },
  {
    id: "smoke",
    name: "Fumé",
    group: "glass",
    color: "#8b8f97",
    metalness: 0,
    roughness: 0.05,
    transmission: 0.9,
    thickness: 7,
    ior: 1.5,
    attenuationColor: "#5b5f67",
    attenuationDistance: 45,
    envMapIntensity: 1.2,
    swatch: glassSphere("#9ea2aa", "#3c3f45"),
  },
  {
    id: "obsidian",
    name: "Obsidienne",
    group: "glass",
    color: "#15161a",
    metalness: 0.1,
    roughness: 0.04,
    transmission: 0.55,
    thickness: 9,
    ior: 1.62,
    attenuationColor: "#0a0a0c",
    attenuationDistance: 14,
    envMapIntensity: 1.4,
    swatch: glassSphere("#2b2c31", "#050506"),
  },
  {
    id: "sapphire",
    name: "Saphir",
    group: "glass",
    color: "#6c9bff",
    metalness: 0,
    roughness: 0.03,
    transmission: 0.95,
    thickness: 8,
    ior: 1.6,
    attenuationColor: "#1d4ed8",
    attenuationDistance: 55,
    envMapIntensity: 1.3,
    swatch: glassSphere("#8db4ff", "#1d4ed8"),
  },
  {
    id: "emerald",
    name: "Émeraude",
    group: "glass",
    color: "#7fe0b0",
    metalness: 0,
    roughness: 0.03,
    transmission: 0.95,
    thickness: 8,
    ior: 1.6,
    attenuationColor: "#047857",
    attenuationDistance: 55,
    envMapIntensity: 1.3,
    swatch: glassSphere("#86e7ba", "#047857"),
  },
  {
    id: "amber",
    name: "Ambre",
    group: "glass",
    color: "#ffd08a",
    metalness: 0,
    roughness: 0.03,
    transmission: 0.95,
    thickness: 8,
    ior: 1.6,
    attenuationColor: "#f59e0b",
    attenuationDistance: 30,
    envMapIntensity: 1.3,
    swatch: glassSphere("#ffdca5", "#d97706"),
  },
  {
    id: "rose",
    name: "Rosé",
    group: "glass",
    color: "#ffc2d1",
    metalness: 0,
    roughness: 0.03,
    transmission: 0.95,
    thickness: 8,
    ior: 1.6,
    attenuationColor: "#f472b6",
    attenuationDistance: 34,
    envMapIntensity: 1.3,
    swatch: glassSphere("#ffd0dc", "#ec4899"),
  },
  {
    id: "amethyst",
    name: "Améthyste",
    group: "glass",
    color: "#dcc7ff",
    metalness: 0,
    roughness: 0.03,
    transmission: 0.95,
    thickness: 8,
    ior: 1.6,
    attenuationColor: "#9333ea",
    attenuationDistance: 55,
    envMapIntensity: 1.3,
    swatch: glassSphere("#e6d6ff", "#7e22ce"),
  },
  {
    id: "holo",
    name: "Holo",
    group: "glass",
    color: "#ffffff",
    metalness: 0,
    roughness: 0.03,
    transmission: 1,
    thickness: 6,
    ior: 1.6,
    iridescence: 1,
    iridescenceIOR: 1.8,
    attenuationColor: "#ffffff",
    attenuationDistance: 200,
    envMapIntensity: 1.5,
    swatch:
      "radial-gradient(circle at 32% 26%, rgba(255,255,255,.98) 0, rgba(255,255,255,.5) 10%, rgba(255,255,255,0) 30%), conic-gradient(from 210deg at 50% 50%, #ff9ad5, #ffe58a, #9cf5c3, #9ad8ff, #c9a7ff, #ff9ad5)",
  },

  // Liquid
  {
    id: "liquid",
    name: "Liquide",
    group: "liquid",
    color: "#17181c",
    metalness: 0.32,
    roughness: 0.03,
    transmission: 0.28,
    thickness: 9,
    ior: 1.58,
    dispersion: 0.55,
    attenuationColor: "#08080a",
    attenuationDistance: 16,
    clearcoat: 1,
    iridescence: 0.45,
    iridescenceIOR: 1.6,
    envMapIntensity: 1.7,
    swatch:
      "radial-gradient(circle at 30% 26%, rgba(255,255,255,.95) 0, rgba(255,255,255,.45) 9%, rgba(255,255,255,0) 26%), radial-gradient(circle at 68% 78%, rgba(255,255,255,.55) 0, rgba(255,255,255,0) 32%), conic-gradient(from 160deg at 40% 45%, #2a2b30, #ff6a3c 7%, #4cff8a 11%, #3c7cff 15%, #16171b 22%, #5a5c63 55%, #0b0b0d 80%)",
  },
  {
    id: "smoked",
    name: "Fumé liquide",
    group: "liquid",
    color: "#b9bcc4",
    metalness: 0,
    roughness: 0.03,
    transmission: 0.96,
    thickness: 8,
    ior: 1.6,
    dispersion: 0.35,
    attenuationColor: "#5f636b",
    attenuationDistance: 40,
    envMapIntensity: 1.4,
    swatch: glassSphere("#b7bbc3", "#3f434a"),
  },
  {
    id: "prism",
    name: "Prisme",
    group: "liquid",
    color: "#ffffff",
    metalness: 0,
    roughness: 0.01,
    transmission: 1,
    thickness: 8,
    ior: 1.75,
    dispersion: 1.2,
    iridescence: 0.4,
    iridescenceIOR: 1.9,
    attenuationColor: "#ffffff",
    attenuationDistance: 240,
    envMapIntensity: 1.7,
    swatch:
      "conic-gradient(from 30deg at 50% 50%, #ff7ab6, #ffd166, #7ef0a8, #63c7ff, #b78cff, #ff7ab6)",
  },
  {
    id: "noir",
    name: "Noir",
    group: "liquid",
    color: "#1c1d22",
    metalness: 0.15,
    roughness: 0.02,
    transmission: 0.72,
    thickness: 10,
    ior: 1.7,
    dispersion: 0.5,
    attenuationColor: "#08080a",
    attenuationDistance: 12,
    envMapIntensity: 1.6,
    swatch: glassSphere("#33343a", "#050506"),
  },

  // Metal
  {
    id: "gold",
    name: "Or",
    group: "metal",
    color: "#f2c14e",
    metalness: 1,
    roughness: 0.16,
    envMapIntensity: 1.4,
    swatch: sphere("#fff4c9", "#e5b93f", "#9c6f12"),
  },
  {
    id: "rose-gold",
    name: "Or rose",
    group: "metal",
    color: "#e7a08a",
    metalness: 1,
    roughness: 0.18,
    envMapIntensity: 1.3,
    swatch: sphere("#ffe0d4", "#d99380", "#9c5f4f"),
  },
  {
    id: "chrome",
    name: "Chrome",
    group: "metal",
    color: "#ffffff",
    metalness: 1,
    roughness: 0.09,
    envMapIntensity: 1.7,
    swatch: "radial-gradient(circle at 32% 24%, #fff 0, rgba(255,255,255,.6) 9%, rgba(255,255,255,0) 34%), radial-gradient(circle at 70% 80%, rgba(0,0,0,.4) 0, rgba(0,0,0,0) 48%), linear-gradient(135deg, #ffffff, #b8bcc4 50%, #5d6169)",
  },
  {
    id: "brushed",
    name: "Brossé",
    group: "metal",
    color: "#c9cdd4",
    metalness: 1,
    roughness: 0.32,
    envMapIntensity: 1.1,
    swatch: "radial-gradient(circle at 32% 24%, #f4f6f9 0, rgba(255,255,255,0) 42%), repeating-linear-gradient(115deg, #d9dce1 0 2px, #b9bec6 2px 3px, #cdd1d7 3px 5px)",
  },
  {
    id: "champagne",
    name: "Champagne",
    group: "metal",
    color: "#d8c3a5",
    metalness: 1,
    roughness: 0.24,
    envMapIntensity: 1.2,
    swatch: sphere("#f8ead5", "#cbb391", "#8d7452"),
  },
  {
    id: "copper",
    name: "Cuivre",
    group: "metal",
    color: "#b46a4a",
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: 1.3,
    swatch: sphere("#f4b798", "#a85c3d", "#69301c"),
  },
  {
    id: "titanium",
    name: "Titane",
    group: "metal",
    color: "#9a9ea6",
    metalness: 1,
    roughness: 0.23,
    envMapIntensity: 1.25,
    swatch: sphere("#e2e6eb", "#8f939b", "#4f535a"),
  },
  {
    id: "black-metal",
    name: "Noir",
    group: "metal",
    color: "#5d5d60",
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: 1.3,
    swatch: sphere("#5c5f66", "#202126", "#070708"),
  },
  {
    id: "bronze",
    name: "Bronze",
    group: "metal",
    color: "#8c5a3c",
    metalness: 1,
    roughness: 0.26,
    envMapIntensity: 1.2,
    swatch: sphere("#d6a57d", "#7e4f33", "#462614"),
  },
  {
    id: "gunmetal",
    name: "Acier",
    group: "metal",
    color: "#4a5058",
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: 1.2,
    swatch: sphere("#a8adb5", "#444a52", "#1c1f23"),
  },
  {
    id: "cobalt",
    name: "Cobalt",
    group: "metal",
    color: "#2653c7",
    metalness: 1,
    roughness: 0.17,
    envMapIntensity: 1.3,
    swatch: sphere("#9db8ff", "#2653c7", "#0d2360"),
  },
  {
    id: "ceramic",
    name: "Céramique",
    group: "metal",
    color: "#f3f2ee",
    metalness: 0.05,
    roughness: 0.34,
    clearcoat: 0.7,
    envMapIntensity: 0.5,
    swatch: sphere("#ffffff", "#f3f2ee", "#c3c2bd"),
  },

  // Color
  {
    id: "color",
    name: "Couleur",
    group: "color",
    color: "#f2f3f5",
    metalness: 1,
    roughness: 0.06,
    envMapIntensity: 1.4,
    swatch: sphere("#ffffff", "#d7dae0", "#8e939b"),
  },
];

export const finishById = (id: string) =>
  finishes.find((finish) => finish.id === id) ?? finishes[2];

export function finishesFor(group: FinishGroup) {
  return finishes.filter((finish) => finish.group === group);
}

export type MaterialOverrides = {
  color?: string;
  metalness?: number;
  roughness?: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  dispersion?: number;
  attenuationColor?: string;
  attenuationDistance?: number;
  clearcoat?: number;
  iridescence?: number;
  iridescenceIOR?: number;
  tint?: string;
  tintDepth?: number;
  reliefMap?: THREE.Texture | null;
};

export function createMaterial(
  finish: Finish,
  overrides: MaterialOverrides = {},
): THREE.MeshPhysicalMaterial {
  const isGlass = finish.group === "glass" || finish.group === "liquid";
  const transmission = overrides.transmission ?? finish.transmission ?? 0;
  const color = new THREE.Color(overrides.tint ?? finish.color);
  const attenuation = new THREE.Color(
    overrides.attenuationColor ?? finish.attenuationColor ?? finish.color,
  );

  const material = new THREE.MeshPhysicalMaterial({
    color,
    metalness: overrides.metalness ?? finish.metalness,
    roughness: overrides.roughness ?? finish.roughness,
    transmission,
    thickness: overrides.thickness ?? finish.thickness ?? 2,
    ior: overrides.ior ?? finish.ior ?? 1.5,
    dispersion: overrides.dispersion ?? finish.dispersion ?? 0,
    attenuationColor: attenuation,
    attenuationDistance:
      overrides.attenuationDistance ?? finish.attenuationDistance ?? 100,
    clearcoat: overrides.clearcoat ?? finish.clearcoat ?? (isGlass ? 0.4 : 0),
    clearcoatRoughness: 0.06,
    iridescence: overrides.iridescence ?? finish.iridescence ?? 0,
    iridescenceIOR: overrides.iridescenceIOR ?? finish.iridescenceIOR ?? 1.3,
    envMapIntensity: finish.envMapIntensity ?? 1.2,
    specularIntensity: 1,
    transparent: transmission > 0,
    // Back faces only matter when light passes through the object.
    side: transmission > 0 ? THREE.DoubleSide : THREE.FrontSide,
  });

  // Per-finish reflection strength. three ignores envMapIntensity for materials
  // lit by scene.environment, so the canvas binds the environment to the
  // material and applies this (times exposure) itself — see EnvBinding.
  material.userData.envBase = finish.envMapIntensity ?? 1.2;

  if (overrides.reliefMap) {
    material.map = overrides.reliefMap;
    material.color.set("#ffffff");
    material.metalness = 0.05;
    material.roughness = 0.42;
    material.transmission = 0;
    material.transparent = false;
    material.side = THREE.FrontSide;
  }

  return material;
}

export type BackgroundPreset = {
  id: string;
  name: string;
  center: string;
  edge: string;
  dark?: boolean;
};

export const backgroundPresets: BackgroundPreset[] = [
  { id: "white", name: "Blanc", center: "#ffffff", edge: "#e4e2de" },
  { id: "midnight", name: "Minuit", center: "#1a2038", edge: "#05060b", dark: true },
  { id: "wave", name: "Néon", center: "#2a2470", edge: "#06061a", dark: true },
  { id: "aurora", name: "Aurora", center: "#0f4a5c", edge: "#050b14", dark: true },
  { id: "studio", name: "Studio", center: "#eff1f4", edge: "#b4b9c2" },
  { id: "paper", name: "Papier", center: "#ffffff", edge: "#f2f3f6" },
  { id: "wall", name: "Mur", center: "#eceef2", edge: "#dfe2e7" },
  { id: "azure", name: "Azure", center: "#bcd5fb", edge: "#6ea8f0" },
  { id: "sky", name: "Ciel", center: "#dce9fd", edge: "#8ebcf8" },
  { id: "sand", name: "Sable", center: "#efe3d2", edge: "#d8c3a5" },
  { id: "blush", name: "Poudré", center: "#f8e3ea", edge: "#e7b7c6" },
  { id: "graphite", name: "Graphite", center: "#3a3d44", edge: "#1f2126", dark: true },
  { id: "ink", name: "Encre", center: "#26282e", edge: "#101114", dark: true },
  { id: "night", name: "Nuit", center: "#101a36", edge: "#050813", dark: true },
  { id: "void", name: "Néant", center: "#000000", edge: "#000000", dark: true },
];

export function backgroundStyle(
  preset: BackgroundPreset,
  mode: "solid" | "linear" | "radial",
  center: string,
  edge: string,
  vignette: number,
) {
  const base =
    mode === "solid"
      ? center
      : mode === "linear"
        ? `linear-gradient(180deg, ${center} 0%, ${edge} 100%)`
        : `radial-gradient(120% 100% at 50% 12%, ${center} 0%, ${edge} 100%)`;
  const vig = Math.round(vignette * 70);
  const vignetteLayer =
    vignette > 0.01
      ? `radial-gradient(90% 80% at 50% 45%, transparent 45%, rgba(0,0,0,${(
          vig / 100
        ).toFixed(3)}) 100%)`
      : null;
  return vignetteLayer ? `${vignetteLayer}, ${base}` : base;
}
