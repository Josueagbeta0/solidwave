"use client";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * AI mode: a full 360° model generated from one photo by an external,
 * free GPU service (open image-to-3D models hosted as public demos). Each
 * visitor uses their own daily allowance through their own sign-in.
 */

const PRIMARY = "microsoft/TRELLIS.2";
const FALLBACK = "trellis-community/TRELLIS";
/** Past this the service is considered stuck. */
const TIMEOUT_MS = 6 * 60 * 1000;

export type AiStage = "connect" | "queue" | "prepare" | "generate" | "finish" | "download";
export type AiProgress = (stage: AiStage, detail?: { position?: number }) => void;

/** The daily allowance is used up; `retryInMs` comes from the service's own message when given. */
export class QuotaError extends Error {
  constructor(public retryInMs: number | null) {
    super("quota");
  }
}

/** "Try again in 23:22:58" → milliseconds. */
export function parseRetry(message: string): number | null {
  const match = /try again in\s+(?:(\d+):)?(\d+):(\d+)/i.exec(message);
  if (!match) return null;
  const [, h, m, s] = match;
  return ((Number(h ?? 0) * 60 + Number(m)) * 60 + Number(s)) * 1000;
}

type StatusMessage = { type: "status"; stage?: string; message?: string | null; title?: string; position?: number };
type DataMessage = { type: "data"; data: unknown[] };
type Job = AsyncIterable<StatusMessage | DataMessage>;
type GradioClient = { submit: (endpoint: string, data: unknown) => Job };
type FileData = { url?: string } | null | undefined;

async function connect(space: string, token: string | null): Promise<GradioClient> {
  const { Client } = await import("@gradio/client");
  const options: Record<string, unknown> = { events: ["data", "status"] };
  if (token) options.hf_token = token;
  return (await Client.connect(space, options)) as unknown as GradioClient;
}

async function call(client: GradioClient, endpoint: string, data: unknown, onProgress: AiProgress, stage: AiStage) {
  for await (const message of client.submit(endpoint, data)) {
    if (message.type === "status") {
      if (message.stage === "error") {
        const text = `${message.title ?? ""} ${message.message ?? ""}`;
        if (/quota/i.test(text)) throw new QuotaError(parseRetry(text));
        throw new Error(text.trim() || "service-error");
      }
      if (message.stage === "pending" && typeof message.position === "number" && message.position > 0) {
        onProgress("queue", { position: message.position });
      } else {
        onProgress(stage);
      }
    }
    if (message.type === "data") return message.data;
  }
  throw new Error("no-result");
}

async function runPrimary(image: Blob, token: string | null, onProgress: AiProgress) {
  const client = await connect(PRIMARY, token);
  await call(client, "/start_session", [], onProgress, "prepare");
  const prepared = await call(client, "/preprocess_image", { input: image }, onProgress, "prepare");
  await call(client, "/image_to_3d", { image: prepared[0], seed: 0, resolution: "1024" }, onProgress, "generate");
  const glb = await call(
    client,
    "/extract_glb",
    { decimation_target: 300000, texture_size: 2048 },
    onProgress,
    "finish",
  );
  return (glb[1] as FileData)?.url ?? (glb[0] as FileData)?.url;
}

async function runFallback(image: Blob, token: string | null, onProgress: AiProgress) {
  const client = await connect(FALLBACK, token);
  await call(client, "/start_session", [], onProgress, "prepare");
  const prepared = await call(client, "/preprocess_image", { image }, onProgress, "prepare");
  const out = await call(
    client,
    "/generate_and_extract_glb",
    { image: prepared[0], multiimages: [], seed: 0, mesh_simplify: 0.95, texture_size: 1024 },
    onProgress,
    "generate",
  );
  return (out[2] as FileData)?.url ?? (out[1] as FileData)?.url;
}

function withTimeout<T>(work: Promise<T>) {
  let timer = 0;
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      timer = window.setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS);
    }),
  ]).finally(() => window.clearTimeout(timer));
}

export type AiModel = { geometry: THREE.BufferGeometry; texture: THREE.Texture | null };

export async function photoToModel(image: Blob, token: string | null, onProgress: AiProgress): Promise<AiModel> {
  onProgress("connect");
  let url: string | undefined;
  try {
    url = await withTimeout(runPrimary(image, token, onProgress));
  } catch (error) {
    // The allowance is per person, not per model: switching models would not help.
    if (error instanceof QuotaError) throw error;
    onProgress("connect");
    url = await withTimeout(runFallback(image, token, onProgress));
  }
  if (!url) throw new Error("no-file");

  onProgress("download");
  const response = await fetch(url);
  if (!response.ok) throw new Error("download");
  return glbToModel(await response.arrayBuffer());
}

/** One merged, centred mesh in the model's own units, plus its colour texture. */
export async function glbToModel(buffer: ArrayBuffer): Promise<AiModel> {
  const gltf = await new GLTFLoader().parseAsync(buffer, "");
  gltf.scene.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  let texture: THREE.Texture | null = null;
  let biggest = 0;
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const source = object.geometry as THREE.BufferGeometry;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", source.getAttribute("position").clone());
    if (source.getAttribute("normal")) geometry.setAttribute("normal", source.getAttribute("normal").clone());
    if (source.getAttribute("uv")) geometry.setAttribute("uv", source.getAttribute("uv").clone());
    if (source.index) geometry.setIndex(source.index.clone());
    geometry.applyMatrix4(object.matrixWorld);
    parts.push(geometry);
    const count = geometry.getAttribute("position").count;
    const material = (Array.isArray(object.material) ? object.material[0] : object.material) as THREE.MeshStandardMaterial;
    if (material?.map && count > biggest) {
      biggest = count;
      texture = material.map;
    }
  });
  if (!parts.length) throw new Error("empty-model");
  const geometry = parts.length === 1 ? parts[0] : (mergeGeometries(parts, false) ?? parts[0]);
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  return { geometry, texture };
}
