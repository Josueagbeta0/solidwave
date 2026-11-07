import type { RefObject } from "react";
import type { Finish } from "@/lib/studio/materials";
import type { MeshQuality } from "@/lib/studio/geometry";

export type CameraView = "angle" | "front" | "side" | "top";
export type MotionMode = "sway" | "turn";
/** none = floating · shadow = contact shadow · soft = raytraced-style area shadow · reflect = mirror. */
export type FloorMode = "none" | "shadow" | "soft" | "reflect";
export type ToneMap = "agx" | "neutral" | "aces";
export type RenderQuality = MeshQuality;

export type PngExportOptions = {
  size: number;
  /** Paints the stage background under the render. Omit for a transparent PNG. */
  paint?: (ctx: CanvasRenderingContext2D, size: number) => void;
};

export type VideoAspect = "square" | "portrait" | "landscape";

export type VideoExportOptions = {
  aspect: VideoAspect;
  /** Length of one full, seamlessly looping turn. */
  seconds: number;
  /** Paints the stage background; videos always carry a backdrop. */
  paint: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  onProgress?: (progress: number) => void;
};

export type StudioActions = {
  exportPng: (options: PngExportOptions) => Promise<void>;
  /** Records a turntable loop; resolves with the file extension used. */
  exportVideo: (options: VideoExportOptions) => Promise<string>;
  exportGlb: () => Promise<void>;
  exportStl: () => Promise<void>;
};

export type MaterialSettings = {
  finish: Finish;
  tint: string;
  metalness: number;
  roughness: number;
  transmission: number;
  thickness: number;
  ior: number;
  dispersion: number;
  iridescence: number;
  clearcoat: number;
  attenuationColor: string;
  attenuationDistance: number;
  /** Source artwork to paint on the object ("Couleurs du logo" or relief mode), or null. */
  artworkUrl: string | null;
};

export type SceneSettings = {
  view: CameraView;
  autoRotate: boolean;
  motion: MotionMode;
  rotateSpeed: number;
  rig: string;
  lightAngle: number;
  studioLight: number;
  exposure: number;
  lens: number;
  floor: FloorMode;
  floorColor: string;
  shadow: number;
  quality: RenderQuality;
  toneMap: ToneMap;
  bloom: number;
  aberration: number;
  grain: number;
};

export type ActionsRef = RefObject<StudioActions | null>;
