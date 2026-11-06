/**
 * Lighting rigs for the studio. Each rig is a set of emissive "softbox" panels
 * baked into the environment map (what glass and metal reflect) plus two
 * direct lights that give the object its shading.
 */

export type LightPanel = {
  form: "rect" | "circle" | "ring";
  intensity: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
  color: string;
};

export type LightRig = {
  id: string;
  name: string;
  /** CSS preview for the picker. */
  swatch: string;
  /** Colour of the environment behind the panels (reflected in dark areas). */
  ambientColor: string;
  /**
   * Vertical gradient of the studio "room" (top, horizon, floor), in linear
   * intensity-scaled colour. Gives flat faces a soft light-to-dark falloff
   * instead of reflecting a uniform void.
   */
  sky: { top: string; horizon: string; bottom: string; intensity: number };
  /**
   * Optional photographed studio (HDRI) used instead of the gradient room.
   * `intensity` scales the dome, `rotation` (radians) orients it, and
   * `panelScale` dims the synthetic panels so they complement rather than swamp it.
   */
  hdri?: { intensity: number; rotation: number; panelScale: number };
  ambient: number;
  key: { position: [number, number, number]; intensity: number; color: string };
  fill: { position: [number, number, number]; intensity: number; color: string };
  panels: LightPanel[];
};

const side = (x: number): [number, number, number] => [0, x > 0 ? -Math.PI / 2 : Math.PI / 2, 0];

export const lightRigs: LightRig[] = [
  {
    id: "studio",
    name: "Studio",
    swatch: "linear-gradient(135deg,#f4f6fb 0%,#9aa3b5 55%,#2a2f3b 100%)",
    ambientColor: "#07090f",
    sky: { top: "#d7deec", horizon: "#5b6478", bottom: "#0b0d13", intensity: 1 },
    hdri: { intensity: 0.4, rotation: Math.PI * 0.75, panelScale: 0.8 },
    ambient: 0.35,
    key: { position: [8, 12, 10], intensity: 1.6, color: "#fff8ef" },
    fill: { position: [-10, -4, 6], intensity: 0.5, color: "#dce6ff" },
    // A big soft top box for body, then thin hard strips that draw crisp
    // highlight lines along bevels — the "product shot" look.
    panels: [
      { form: "rect", intensity: 2.2, position: [0, 9, 4], rotation: [-Math.PI / 2.3, 0, 0], scale: [14, 8, 1], color: "#ffffff" },
      { form: "rect", intensity: 9, position: [-6, 1, 6], rotation: [0, Math.PI / 4.5, 0], scale: [0.9, 16, 1], color: "#ffffff" },
      { form: "rect", intensity: 7, position: [6.5, 0, 5], rotation: [0, -Math.PI / 4, 0], scale: [0.7, 16, 1], color: "#fff4e6" },
      { form: "rect", intensity: 3.5, position: [-9, 0, -2], rotation: side(-9), scale: [3, 14, 1], color: "#dfe8ff" },
      { form: "rect", intensity: 5, position: [0, 4, -9], rotation: [0, Math.PI, 0], scale: [16, 0.6, 1], color: "#ffffff" },
      { form: "rect", intensity: 0.5, position: [-4, -7, 7], rotation: [Math.PI / 3, 0, 0], scale: [6, 1.5, 1], color: "#c9d6f2" },
    ],
  },
  {
    id: "wave",
    name: "Néon",
    swatch: "linear-gradient(120deg,#39e1ff 0%,#5b7cff 40%,#9b5cff 70%,#ff5cc8 100%)",
    ambientColor: "#070816",
    sky: { top: "#8e9bff", horizon: "#3b2c7a", bottom: "#07061a", intensity: 0.9 },
    ambient: 0.3,
    key: { position: [6, 10, 10], intensity: 1.3, color: "#f2f4ff" },
    fill: { position: [-9, -2, 6], intensity: 0.9, color: "#7f8cff" },
    panels: [
      { form: "rect", intensity: 3.2, position: [0, 7, 8], scale: [10, 3, 1], color: "#ffffff" },
      { form: "rect", intensity: 6, position: [-7, 0, 3], rotation: side(-7), scale: [2.2, 14, 1], color: "#39e1ff" },
      { form: "rect", intensity: 6, position: [7, 0, 3], rotation: side(7), scale: [2.2, 14, 1], color: "#ff5cc8" },
      { form: "rect", intensity: 3, position: [0, -5, 6], rotation: [Math.PI / 2.4, 0, 0], scale: [12, 2, 1], color: "#5b7cff" },
      { form: "ring", intensity: 2.2, position: [0, 0, -9], rotation: [0, Math.PI, 0], scale: [6, 6, 1], color: "#9b5cff" },
    ],
  },
  {
    id: "golden",
    name: "Heure dorée",
    swatch: "linear-gradient(135deg,#ffe2b0 0%,#ff9d5c 50%,#3a2a4f 100%)",
    ambientColor: "#140d12",
    sky: { top: "#ffd9ad", horizon: "#7a4e44", bottom: "#100a0b", intensity: 0.95 },
    ambient: 0.35,
    key: { position: [10, 8, 6], intensity: 1.9, color: "#ffd2a1" },
    fill: { position: [-10, 2, 4], intensity: 0.5, color: "#8fa8ff" },
    panels: [
      { form: "rect", intensity: 5, position: [7, 5, 6], rotation: [0, -Math.PI / 4, 0], scale: [9, 6, 1], color: "#ffcf96" },
      { form: "rect", intensity: 2, position: [-8, 2, 4], rotation: side(-8), scale: [7, 8, 1], color: "#ffe9d2" },
      { form: "rect", intensity: 2.4, position: [0, 2, -8], rotation: [0, Math.PI, 0], scale: [10, 4, 1], color: "#7d8cff" },
      { form: "circle", intensity: 1.4, position: [0, -5, 9], scale: [5, 5, 1], color: "#ffb37a" },
    ],
  },
  {
    id: "softbox",
    name: "Boîte à lumière",
    swatch: "linear-gradient(180deg,#ffffff 0%,#dfe4ee 60%,#b9c1d1 100%)",
    ambientColor: "#1a1d26",
    sky: { top: "#ffffff", horizon: "#9aa3b5", bottom: "#2a2e38", intensity: 1 },
    hdri: { intensity: 0.5, rotation: Math.PI * 0.75, panelScale: 0.7 },
    ambient: 0.7,
    key: { position: [0, 14, 8], intensity: 1.2, color: "#ffffff" },
    fill: { position: [0, -6, 8], intensity: 0.6, color: "#ffffff" },
    panels: [
      { form: "rect", intensity: 3, position: [0, 8, 4], rotation: [-Math.PI / 2.6, 0, 0], scale: [18, 12, 1], color: "#ffffff" },
      { form: "rect", intensity: 1.8, position: [-9, 0, 4], rotation: side(-9), scale: [10, 10, 1], color: "#ffffff" },
      { form: "rect", intensity: 1.8, position: [9, 0, 4], rotation: side(9), scale: [10, 10, 1], color: "#ffffff" },
      { form: "rect", intensity: 1.6, position: [0, 0, 10], scale: [14, 8, 1], color: "#f6f8ff" },
    ],
  },
  {
    id: "noir",
    name: "Noir",
    swatch: "linear-gradient(135deg,#ffffff 0%,#3b3f4a 22%,#05060a 100%)",
    ambientColor: "#030305",
    sky: { top: "#4a4f5c", horizon: "#111318", bottom: "#000000", intensity: 0.6 },
    ambient: 0.12,
    key: { position: [9, 9, 7], intensity: 2.2, color: "#ffffff" },
    fill: { position: [-10, -3, 5], intensity: 0.15, color: "#9fb1ff" },
    panels: [
      { form: "rect", intensity: 7, position: [6, 3, 6], rotation: [0, -Math.PI / 3.5, 0], scale: [1.6, 14, 1], color: "#ffffff" },
      { form: "rect", intensity: 2.2, position: [-6, 4, -4], rotation: [0, Math.PI * 0.75, 0], scale: [1.2, 12, 1], color: "#cfd8ff" },
    ],
  },
];

export const rigById = (id: string) => lightRigs.find((rig) => rig.id === id) ?? lightRigs[0];
