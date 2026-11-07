import * as THREE from "three";

export type Backdrop = { center: string; edge: string };

/** Neutral grey photo-studio sweep: silver and white objects keep their contrast. */
export const WHITE_STUDIO: Backdrop = { center: "#eff1f4", edge: "#b4b9c2" };
/** Cool grey studio sweep: clear glass reads as glass here, not as a hole. */
export const GLASS_STUDIO: Backdrop = { center: "#e8eaef", edge: "#a7aebb" };
/** Neutral studio at night (dark). */
export const DARK_STUDIO: Backdrop = { center: "#2c2e34", edge: "#08090b" };

const hex = (color: THREE.Color) => `#${color.getHexString(THREE.SRGBColorSpace)}`;

/**
 * A backdrop that flatters a finish and keeps it readable, balancing light and
 * dark stages:
 * - silver metals (chrome, brushed, titanium) → white studio; their reflections carry the contrast;
 * - clear glass and white matte finishes → cool grey sweep: glass shows what is behind it,
 *   so a dark stage turns it into a dark plate, white turns it invisible, and white
 *   ceramic glows on black;
 * - light, coloured objects (gold, champagne, pale tinted glass)
 *   → a dark stage tinted with their hue, where highlights and refraction glow;
 * - dark or deep objects (black, obsidian, cobalt, copper, bronze)
 *   → a light stage: a pastel of their hue, or white for neutral blacks.
 */
export function autoBackdrop(color: string, metalness = 0, transmission = 0): Backdrop {
  const hsl = { h: 0, s: 0, l: 0 };
  const c = new THREE.Color(color);
  c.getHSL(hsl, THREE.SRGBColorSpace);
  const [r, g, b] = c.clone().convertLinearToSRGB().toArray();
  // Chroma, not HSL saturation: near-white tints like #f7f8fa have a high
  // saturation but no visible colour.
  const neutral = Math.max(r, g, b) - Math.min(r, g, b) < 0.06;
  const light = hsl.l > 0.58;

  if (neutral) {
    if (metalness > 0.5 && hsl.l > 0.45) return WHITE_STUDIO;
    // Clear glass and white matte objects (frosted, milk, ceramic) read best on a
    // cool grey: a dark stage makes white glow, pure white makes glass vanish.
    if (light && (transmission > 0.6 || metalness < 0.5)) return GLASS_STUDIO;
    return WHITE_STUDIO;
  }

  const saturation = Math.min(hsl.s, 0.75);
  if (light) {
    const center = new THREE.Color().setHSL(hsl.h, saturation * 0.55, 0.17, THREE.SRGBColorSpace);
    const edge = new THREE.Color().setHSL(hsl.h, saturation * 0.5, 0.045, THREE.SRGBColorSpace);
    return { center: hex(center), edge: hex(edge) };
  }
  const center = new THREE.Color().setHSL(hsl.h, saturation * 0.45, 0.965, THREE.SRGBColorSpace);
  const edge = new THREE.Color().setHSL(hsl.h, saturation * 0.4, 0.82, THREE.SRGBColorSpace);
  return { center: hex(center), edge: hex(edge) };
}

/** Perceived brightness (0–1) of a hex colour; below ~0.45 the stage reads as dark. */
export function luminance(color: string) {
  const c = new THREE.Color(color);
  return Math.pow(0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, 1 / 2.2);
}

/** Linear-RGB interpolation between two hex colours. */
export function mixHex(from: string, to: string, t: number) {
  return `#${new THREE.Color(from).lerp(new THREE.Color(to), t).getHexString()}`;
}
