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
  /** Outer silhouette loops in UV space: the artwork is clipped to them, slightly inset. */
  outlineUV: [number, number][][] = [],
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

  // The artwork alone: the whole image scaled so the crop fills the canvas
  // (browsers rasterise SVG at the destination size, so vector logos stay sharp),
  // clipped to the outer silhouette pulled in by ~1.5 source pixels. Outside
  // it, including the anti-aliased band where the logo meets an opaque
  // background, colours come from the bleed below (the logo's own edge
  // colour), so caps and walls never show a rim of background colour. Only
  // the outer edge is touched: holes and inner line art are kept as drawn.
  const art = document.createElement("canvas");
  art.width = width;
  art.height = height;
  const artCtx = art.getContext("2d");
  if (!artCtx) return null;
  artCtx.drawImage(image, -u0 * naturalWidth * scale, -v0 * naturalHeight * scale, naturalWidth * scale, naturalHeight * scale);
  if (outlineUV.length) {
    const path = new Path2D();
    for (const loop of outlineUV) {
      loop.forEach(([u, v], index) => {
        const x = u * width;
        const y = (1 - v) * height;
        if (index === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      });
      path.closePath();
    }
    const mask = document.createElement("canvas");
    mask.width = width;
    mask.height = height;
    const maskCtx = mask.getContext("2d");
    if (maskCtx) {
      maskCtx.fillStyle = "#fff";
      maskCtx.fill(path, "nonzero");
      maskCtx.globalCompositeOperation = "destination-out";
      maskCtx.lineJoin = "round";
      maskCtx.lineWidth = Math.max(3, scale * 3);
      maskCtx.stroke(path);
      artCtx.globalCompositeOperation = "destination-in";
      artCtx.drawImage(mask, 0, 0);
      artCtx.globalCompositeOperation = "source-over";
    }
  }
  const draw = () => ctx.drawImage(art, 0, 0);

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
