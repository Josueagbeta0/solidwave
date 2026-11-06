import type { FloorMode, ToneMap } from "@/lib/studio/types";

/**
 * A "look" is a complete art direction applied in one click: finish, lighting
 * rig, backdrop, floor and post-processing, tuned to work together.
 */
export type Look = {
  id: string;
  name: string;
  blurb: string;
  finish: string;
  rig: string;
  lightAngle: number;
  studioLight: number;
  exposure: number;
  backdrop: { center: string; edge: string; mode: "solid" | "linear" | "radial"; preset?: string };
  halo: number;
  vignette: number;
  floor: FloorMode;
  shadow: number;
  toneMap: ToneMap;
  bloom: number;
  /** CSS for the picker card. */
  preview: string;
};

export const looks: Look[] = [
  {
    id: "studio-blanc",
    name: "Studio blanc",
    blurb: "Chrome sur fond blanc, ombre douce : le packshot classique.",
    finish: "chrome",
    rig: "studio",
    lightAngle: 0,
    studioLight: 1.4,
    exposure: 1,
    backdrop: { center: "#ffffff", edge: "#e4e2de", mode: "radial", preset: "white" },
    halo: 0,
    vignette: 0.08,
    floor: "soft",
    shadow: 0.6,
    toneMap: "neutral",
    bloom: 0.15,
    preview: "radial-gradient(90% 80% at 50% 25%, #ffffff, #e4e2de)",
  },
  {
    id: "midnight-glass",
    name: "Verre de minuit",
    blurb: "Verre clair, bandes de lumière nettes, sol miroir.",
    finish: "clear",
    rig: "studio",
    lightAngle: 0,
    studioLight: 1.6,
    exposure: 1,
    backdrop: { center: "#1a2038", edge: "#05060b", mode: "radial", preset: "midnight" },
    halo: 0.35,
    vignette: 0.35,
    floor: "reflect",
    shadow: 0.6,
    toneMap: "neutral",
    bloom: 0.35,
    preview: "radial-gradient(90% 80% at 50% 20%, #2a335a, #05060b)",
  },
  {
    id: "neon-wave",
    name: "Vague néon",
    blurb: "Verre holographique sous des liserés cyan et magenta.",
    finish: "holo",
    rig: "wave",
    lightAngle: 0,
    studioLight: 1.5,
    exposure: 1.05,
    backdrop: { center: "#2a2470", edge: "#06061a", mode: "radial", preset: "wave" },
    halo: 0.55,
    vignette: 0.45,
    floor: "reflect",
    shadow: 0.5,
    toneMap: "neutral",
    bloom: 0.7,
    preview: "radial-gradient(70% 60% at 50% 45%, #9b5cff, #2a2470 55%, #06061a)",
  },
  {
    id: "gallery",
    name: "Galerie",
    blurb: "Céramique blanche sur un fond clair sans raccord.",
    finish: "ceramic",
    rig: "studio",
    lightAngle: -20,
    studioLight: 1.3,
    exposure: 0.95,
    backdrop: { center: "#f4f5f8", edge: "#c9ced8", mode: "radial", preset: "studio" },
    halo: 0,
    vignette: 0.15,
    floor: "soft",
    shadow: 0.7,
    toneMap: "neutral",
    bloom: 0.1,
    preview: "radial-gradient(90% 80% at 50% 20%, #ffffff, #c9ced8)",
  },
  {
    id: "golden-hour",
    name: "Heure dorée",
    blurb: "Or poli dans la lumière chaude et rasante du soir.",
    finish: "gold",
    rig: "golden",
    lightAngle: 25,
    studioLight: 1.7,
    exposure: 1,
    backdrop: { center: "#3a2416", edge: "#0b0705", mode: "radial" },
    halo: 0.4,
    vignette: 0.5,
    floor: "reflect",
    shadow: 0.6,
    toneMap: "aces",
    bloom: 0.45,
    preview: "radial-gradient(80% 70% at 60% 30%, #c9874a, #3a2416 55%, #0b0705)",
  },
  {
    id: "noir-chrome",
    name: "Chrome noir",
    blurb: "Chrome miroir découpé par une seule bande de lumière.",
    finish: "chrome",
    rig: "noir",
    lightAngle: 0,
    studioLight: 1.8,
    exposure: 1,
    backdrop: { center: "#101114", edge: "#000000", mode: "radial", preset: "void" },
    halo: 0,
    vignette: 0.6,
    floor: "reflect",
    shadow: 0.8,
    toneMap: "neutral",
    bloom: 0.25,
    preview: "linear-gradient(115deg, #000 0 38%, #e9edf5 46%, #1a1c22 54%, #000 100%)",
  },
  {
    id: "candy",
    name: "Bonbon",
    blurb: "Verre rosé et lumière pastel douce.",
    finish: "rose",
    rig: "softbox",
    lightAngle: 15,
    studioLight: 1.4,
    exposure: 1.05,
    backdrop: { center: "#f8e3ea", edge: "#e7b7c6", mode: "radial", preset: "blush" },
    halo: 0.3,
    vignette: 0.1,
    floor: "soft",
    shadow: 0.5,
    toneMap: "neutral",
    bloom: 0.2,
    preview: "radial-gradient(90% 80% at 50% 20%, #fff0f5, #e7b7c6)",
  },
  {
    id: "aurora",
    name: "Aurore",
    blurb: "Verre émeraude lumineux sur un fond bleu-vert profond.",
    finish: "emerald",
    rig: "wave",
    lightAngle: -35,
    studioLight: 1.4,
    exposure: 1,
    backdrop: { center: "#0f4a5c", edge: "#050b14", mode: "radial", preset: "aurora" },
    halo: 0.5,
    vignette: 0.4,
    floor: "reflect",
    shadow: 0.5,
    toneMap: "neutral",
    bloom: 0.55,
    preview: "radial-gradient(80% 70% at 40% 30%, #2fd6a3, #0f4a5c 50%, #050b14)",
  },
  {
    id: "obsidian",
    name: "Obsidienne",
    blurb: "Verre noir liquide aux reflets irisés.",
    finish: "liquid",
    rig: "studio",
    lightAngle: 30,
    studioLight: 1.9,
    exposure: 1,
    backdrop: { center: "#2a2c33", edge: "#0b0c0f", mode: "radial", preset: "graphite" },
    halo: 0.15,
    vignette: 0.45,
    floor: "soft",
    shadow: 0.85,
    toneMap: "neutral",
    bloom: 0.3,
    preview: "radial-gradient(70% 60% at 50% 35%, #3a3d46, #121317 60%, #08090b)",
  },
];

export const lookById = (id: string) => looks.find((look) => look.id === id);
