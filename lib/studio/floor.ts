import * as THREE from "three";

/** Size of the reflective floor plane, in scene units. */
export const FLOOR_SIZE = 140;

/**
 * Radial alpha mask for the mirror floor: opaque under the object, fully
 * transparent well before the plane's edge, so no horizon line ever shows.
 * `solid` and `clear` are radii in scene units.
 */
export function createFloorFade(solid = 7, clear = 30): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const half = FLOOR_SIZE / 2;
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(Math.min(0.98, solid / half), "#ffffff");
  // Ease the falloff with an extra stop so it reads as light falling off, not a ring.
  gradient.addColorStop(Math.min(0.99, (solid + (clear - solid) * 0.45) / half), "#5a5a5a");
  gradient.addColorStop(Math.min(1, clear / half), "#000000");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
