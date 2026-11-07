import * as THREE from "three";
import type { ArtworkCrop } from "@/lib/studio/geometry";

/** Longest side of the artwork texture. Enough for crisp caps at 4K export. */
const MAX_SIDE = 2048;

/**
 * Builds the colour texture for "Couleurs du logo": the source image cropped
 * to the object's outline (so UV 0–1 spans exactly the traced shapes), drawn
 * at texture resolution so SVGs stay vector-sharp.
 *
 * Transparent pixels around the logo are filled with blurred copies of it
 * ("bleed"): walls and bevels sample just inside the outline, and the bleed
 * keeps the anti-aliased border from turning them black or grey.
 */
export function createArtworkTexture(
  image: HTMLImageElement | ImageBitmap,
  crop: ArtworkCrop | null,
): THREE.CanvasTexture | null {
  const naturalWidth = "naturalWidth" in image ? image.naturalWidth || image.width : image.width;
  const naturalHeight = "naturalHeight" in image ? image.naturalHeight || image.height : image.height;
  if (!naturalWidth || !naturalHeight) return null;

  const { u0, v0, u1, v1 } = crop ?? { u0: 0, v0: 0, u1: 1, v1: 1 };
  const cropWidth = Math.max(1e-4, u1 - u0) * naturalWidth;
  const cropHeight = Math.max(1e-4, v1 - v0) * naturalHeight;
  const scale = MAX_SIDE / Math.max(cropWidth, cropHeight);
  const width = Math.max(4, Math.round(cropWidth * scale));
  const height = Math.max(4, Math.round(cropHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Draw the whole image scaled so the crop fills the canvas: browsers rasterise
  // SVG at the destination size, so vector logos stay sharp.
  const draw = () =>
    ctx.drawImage(image, -u0 * naturalWidth * scale, -v0 * naturalHeight * scale, naturalWidth * scale, naturalHeight * scale);

  // Bleed: wide to narrow blurred copies under the sharp image.
  const unit = Math.max(width, height) / 512;
  for (const radius of [24, 10, 4, 1.5]) {
    ctx.filter = `blur(${(radius * unit).toFixed(1)}px)`;
    draw();
    draw();
  }
  ctx.filter = "none";
  draw();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}
