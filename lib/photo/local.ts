"use client";

import * as THREE from "three";
import type { ReliefInput } from "@/lib/photo/relief";

/**
 * Free on-device mode: cuts the subject out of the photo and estimates its
 * depth with two small open models run by transformers.js in the browser.
 * The photo never leaves the device; the models (~70 MB) are downloaded once
 * and cached by the browser.
 */

const CUTOUT_MODEL = "onnx-community/ormbg-ONNX"; // Apache-2.0
const DEPTH_MODEL = "onnx-community/depth-anything-v2-small"; // Apache-2.0
/** Long side of the grid the relief is built on. */
const GRID = 384;

export type LocalStage = "models" | "cutout" | "depth" | "mesh";
export type LocalProgress = (stage: LocalStage, progress?: number) => void;

type Runner = (input: string) => Promise<unknown>;
let runners: Promise<{ cutout: Runner; depth: Runner }> | null = null;

function loadRunners(onProgress: LocalProgress) {
  if (runners) return runners;
  runners = (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    // Download progress across both models' files, weighted by bytes.
    const files = new Map<string, { loaded: number; total: number }>();
    const progress_callback = (event: { status?: string; file?: string; loaded?: number; total?: number }) => {
      if (event.status !== "progress" || !event.file) return;
      files.set(event.file, { loaded: event.loaded ?? 0, total: event.total ?? 0 });
      let loaded = 0;
      let total = 0;
      for (const file of files.values()) {
        loaded += file.loaded;
        total += file.total;
      }
      if (total > 0) onProgress("models", loaded / total);
    };
    const options = { dtype: "q8", device: "wasm", progress_callback } as const;
    const [cutout, depth] = await Promise.all([
      pipeline("background-removal", CUTOUT_MODEL, options),
      pipeline("depth-estimation", DEPTH_MODEL, options),
    ]);
    return { cutout: cutout as unknown as Runner, depth: depth as unknown as Runner };
  })();
  runners.catch(() => {
    runners = null;
  });
  return runners;
}

type RawImageLike = { width: number; height: number; toCanvas: () => OffscreenCanvas | HTMLCanvasElement };

function sample(image: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
}

export type LocalResult = {
  relief: ReliefInput;
  /** The cut-out photo with colours bled past the outline, ready for the mesh UVs. */
  texture: THREE.Texture;
};

export async function photoToRelief(url: string, onProgress: LocalProgress): Promise<LocalResult> {
  onProgress("models", 0);
  const { cutout, depth } = await loadRunners(onProgress);

  onProgress("cutout");
  const cut = (await cutout(url)) as RawImageLike;
  const cutCanvas = cut.toCanvas() as CanvasImageSource;

  onProgress("depth");
  const estimate = (await depth(url)) as { depth: RawImageLike };
  const depthCanvas = estimate.depth.toCanvas() as CanvasImageSource;

  onProgress("mesh");
  const aspect = cut.width / cut.height;
  const width = aspect >= 1 ? GRID : Math.max(16, Math.round(GRID * aspect));
  const height = aspect >= 1 ? Math.max(16, Math.round(GRID / aspect)) : GRID;
  const cutPixels = sample(cutCanvas, width, height);
  const depthPixels = sample(depthCanvas, width, height);
  const alpha = new Float32Array(width * height);
  const depthValues = new Float32Array(width * height);
  for (let i = 0; i < alpha.length; i++) {
    alpha[i] = cutPixels[i * 4 + 3] / 255;
    depthValues[i] = depthPixels[i * 4] / 255;
  }
  let covered = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] >= 0.5) covered++;
  if (covered < alpha.length * 0.01) throw new Error("no-subject");

  return {
    relief: { width, height, alpha, depth: depthValues },
    texture: bledTexture(cutCanvas, cut.width, cut.height),
  };
}

/** Fills the transparent surroundings with blurred copies so outline UVs never sample the background. */
function bledTexture(source: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
  const scale = Math.min(1, 2048 / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const unit = Math.max(width, height) / 512;
  for (const radius of [24, 10, 4, 1.5]) {
    ctx.filter = `blur(${(radius * unit).toFixed(1)}px)`;
    ctx.drawImage(source, 0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
  }
  ctx.filter = "none";
  ctx.drawImage(source, 0, 0, width, height);
  // Opaque everywhere: the material never blends.
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
