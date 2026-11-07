"use client";

import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  AccumulativeShadows,
  ContactShadows,
  Environment,
  RandomizedLight,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
} from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  ToneMapping,
} from "@react-three/postprocessing";
import {
  BlendFunction,
  ToneMappingMode,
  type EffectComposer as EffectComposerImpl,
} from "postprocessing";
import { memo, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { GLTFExporter, STLExporter } from "three-stdlib";
import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { createMaterial } from "@/lib/studio/materials";
import { createArtworkTexture } from "@/lib/studio/artwork";
import { loadHtmlImage } from "@/lib/trace";
import { rigById, type LightRig as LightRigDef } from "@/lib/studio/lighting";
import { createFloorFade, FLOOR_SIZE } from "@/lib/studio/floor";
import type { BuiltIcon } from "@/lib/studio/geometry";
import type {
  ActionsRef,
  CameraView,
  MaterialSettings,
  PngExportOptions,
  RenderQuality,
  SceneSettings,
  ToneMap,
  VideoAspect,
  VideoExportOptions,
} from "@/lib/studio/types";

const videoSizes: Record<VideoAspect, [number, number]> = {
  square: [1080, 1080],
  portrait: [1080, 1920],
  landscape: [1920, 1080],
};

const viewDirections: Record<CameraView, THREE.Vector3> = {
  angle: new THREE.Vector3(0.62, 0.36, 1).normalize(),
  front: new THREE.Vector3(0, 0, 1),
  side: new THREE.Vector3(1, 0.04, 0.06).normalize(),
  top: new THREE.Vector3(0, 1, 0.001).normalize(),
};

/** Per-quality renderer budget. */
const qualityBudget: Record<
  RenderQuality,
  { dpr: [number, number]; env: number; shadow: number; msaa: number; post: boolean }
> = {
  draft: { dpr: [1, 1.25], env: 256, shadow: 512, msaa: 0, post: false },
  high: { dpr: [1, 2], env: 512, shadow: 1024, msaa: 4, post: true },
  ultra: { dpr: [1.5, 2.5], env: 1024, shadow: 2048, msaa: 4, post: true },
};

const threeToneMap: Record<ToneMap, THREE.ToneMapping> = {
  agx: THREE.AgXToneMapping,
  neutral: THREE.NeutralToneMapping,
  aces: THREE.ACESFilmicToneMapping,
};

const postToneMap: Record<ToneMap, ToneMappingMode> = {
  agx: ToneMappingMode.AGX,
  neutral: ToneMappingMode.NEUTRAL,
  aces: ToneMappingMode.ACES_FILMIC,
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Encoder timed out")), ms)),
  ]);
}

/**
 * First H.264 encoder config the browser supports at this size, or null.
 * "realtime" latency skips the encoder's look-ahead: it is several times
 * faster per frame, and at this bitrate the loss is invisible.
 */
async function pickH264Config(width: number, height: number, fps: number) {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  for (const latencyMode of ["realtime", "quality"] as const) {
    for (const codec of ["avc1.640033", "avc1.4d0033", "avc1.42003e"]) {
      const config: VideoEncoderConfig = { codec, width, height, bitrate: 18_000_000, framerate: fps, latencyMode };
      try {
        const { supported } = await VideoEncoder.isConfigSupported(config);
        if (supported) return config;
      } catch {
        /* try the next profile */
      }
    }
  }
  return null;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}


function RendererSettings({ toneMap, post }: { toneMap: ToneMap; post: boolean }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    // With post-processing on, the ToneMapping effect owns tone mapping.
    if (!post) gl.toneMapping = threeToneMap[toneMap];
    gl.toneMappingExposure = 1;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl, toneMap, post]);
  return null;
}

/** Exposure is applied to every light source, so it behaves the same with or without post. */
function Exposure({ exposure }: { exposure: number }) {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    scene.environmentIntensity = exposure;
  }, [scene, exposure]);
  return null;
}

/**
 * Binds the scene environment directly to the object's material. three only
 * honours a material's envMapIntensity when its envMap is set; through
 * scene.environment every finish would reflect at the same strength.
 */
function EnvBinding({ material, exposure }: { material: THREE.MeshPhysicalMaterial; exposure: number }) {
  useFrame(({ scene }) => {
    const env = scene.environment;
    if (material.envMap !== env) {
      material.envMap = env;
      material.needsUpdate = true;
    }
    material.envMapIntensity = ((material.userData.envBase as number | undefined) ?? 1) * exposure;
  });
  return null;
}

/**
 * On-demand rendering helper. The studio canvas only draws when something
 * changes; when `token` changes this asks for `frames` consecutive frames so
 * multi-pass effects (transmission, mirror, contact and soft shadows) settle.
 */
function Settle({ token, frames }: { token: string; frames: number }) {
  const invalidate = useThree((state) => state.invalidate);
  const left = useRef(0);
  useEffect(() => {
    left.current = frames;
    invalidate();
  }, [token, frames, invalidate]);
  useFrame((state) => {
    if (left.current <= 0) return;
    left.current -= 1;
    state.invalidate();
  });
  return null;
}

export type StagePainter = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
type StageHandle = { repaint: (width: number, height: number) => void };

const isTransmissionTarget = (target: THREE.WebGLRenderTarget | null) =>
  !!target && target.resolveDepthBuffer === false && target.texture.generateMipmaps === true;

/**
 * Glass needs something to refract. The visible stage is CSS behind a transparent
 * canvas, so three's transmission pass would otherwise see a flat grey clear colour.
 * This full-screen quad paints the same stage, but only into the transmission
 * buffer: the main pass discards it, so the canvas (and transparent PNGs) stay clear.
 */
export function StageBackdrop({
  paint,
  paintKey,
  handleRef,
}: {
  paint?: StagePainter;
  paintKey?: string;
  handleRef?: React.RefObject<StageHandle | null>;
}) {
  const size = useThree((state) => state.size);
  const paintRef = useRef(paint);
  useEffect(() => {
    paintRef.current = paint;
  });

  const { mesh, texture, canvas } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.ShaderMaterial({
      uniforms: { map: { value: texture }, show: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform float show;
        varying vec2 vUv;
        void main() {
          if (show < 0.5) discard;
          gl_FragColor = texture2D(map, vUv);
          #include <colorspace_fragment>
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -1000;
    mesh.onBeforeRender = (renderer) => {
      material.uniforms.show.value = isTransmissionTarget(renderer.getRenderTarget()) ? 1 : 0;
      material.uniformsNeedUpdate = true;
    };
    return { mesh, texture, canvas };
  }, []);

  useEffect(
    () => () => {
      texture.dispose();
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    },
    [mesh, texture],
  );

  useEffect(() => {
    const repaint = (width: number, height: number) => {
      const scale = Math.min(1, 1024 / Math.max(width, height, 1));
      canvas.width = Math.max(2, Math.round(width * scale));
      canvas.height = Math.max(2, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (paintRef.current) paintRef.current(ctx, canvas.width, canvas.height);
      else {
        ctx.fillStyle = "#0b0e17";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      // A resized canvas needs a fresh GPU texture.
      texture.dispose();
      texture.needsUpdate = true;
    };
    if (handleRef) handleRef.current = { repaint };
    repaint(size.width, size.height);
  }, [canvas, texture, handleRef, size.width, size.height, paintKey]);

  return <primitive object={mesh} />;
}

/**
 * Requests a frame on every display refresh for `ms`. With on-demand rendering,
 * invalidating only from inside useFrame can stall and freeze an animation
 * half-way (camera moves, the entrance, shadow accumulation), so animations
 * that must finish drive their frames from here. Returns a cancel function.
 */
function keepFrames(invalidate: () => void, ms: number, done?: () => boolean) {
  // With `done`, run until it reports true (ms is then only a safety cap):
  // the first frames after a load can take a second to compile shaders.
  const end = performance.now() + ms;
  let frame = 0;
  const tick = () => {
    invalidate();
    if (performance.now() < end && !done?.()) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

function CameraRig({
  view,
  lens,
  icon,
  fitTick,
}: {
  view: CameraView;
  lens: number;
  icon: BuiltIcon | null;
  fitTick: number;
}) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const invalidate = useThree((state) => state.invalidate);
  const animation = useRef<{ from: THREE.Vector3; to: THREE.Vector3; progress: number } | null>(
    null,
  );
  const hasMounted = useRef(false);

  const distance = useMemo(() => {
    const max = icon ? Math.max(icon.size.x, icon.size.y, icon.size.z) * 0.1 : 10;
    const fov = THREE.MathUtils.degToRad(lens);
    // Leave breathing room around the object, like a product shot.
    return (max / (2 * Math.tan(fov / 2))) * 2.6 + 2.5;
  }, [icon, lens]);

  useEffect(() => {
    camera.fov = lens;
    camera.near = 0.1;
    camera.far = 2000;
    camera.updateProjectionMatrix();
  }, [camera, lens]);

  useEffect(() => {
    if (!controls) return;
    controls.target.set(0, 0, 0);
    const to = viewDirections[view].clone().multiplyScalar(distance);
    if (!hasMounted.current) {
      camera.position.copy(to);
      hasMounted.current = true;
      animation.current = null;
    } else {
      animation.current = { from: camera.position.clone(), to, progress: 0 };
    }
    invalidate();
    const stopFrames = keepFrames(invalidate, 6000, () => animation.current === null);
    const cancel = () => {
      animation.current = null;
    };
    controls.addEventListener("start", cancel);
    return () => {
      stopFrames();
      controls.removeEventListener("start", cancel);
    };
  }, [view, distance, controls, camera, fitTick, invalidate]);

  useFrame((state, delta) => {
    if (!animation.current) return;
    // On-demand rendering: keep asking for frames until the move lands.
    state.invalidate();
    // Clamp delta: the first frame after an idle period would otherwise jump.
    animation.current.progress = Math.min(1, animation.current.progress + Math.min(delta, 1 / 30) * 3.6);
    const t = 1 - Math.pow(1 - animation.current.progress, 4);
    camera.position.lerpVectors(animation.current.from, animation.current.to, t);
    camera.lookAt(0, 0, 0);
    if (animation.current.progress >= 1) animation.current = null;
  });

  return null;
}

/** Length of the entrance played when a new object loads. */
const ENTRY_SECONDS = 0.75;

function IconModel({
  icon,
  settings,
  spinRef,
  entryKey,
  onEntryEnd,
}: {
  icon: BuiltIcon | null;
  settings: SceneSettings;
  /** When set, the turntable angle is driven from outside (video recording). */
  spinRef: React.RefObject<number | null>;
  /** Bumped for each newly loaded object. */
  entryKey: number;
  /** Called once the entrance has finished. */
  onEntryEnd?: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  // Entrance start time (ms); -1 = waiting for the first frame; null when idle.
  // Timed on the clock, not frame count, so it ends on time even on slow devices
  // or when the first frame spends a moment compiling shaders.
  const entry = useRef<number | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (entryKey === 0) return;
    entry.current = -1;
    return keepFrames(invalidate, 8000, () => entry.current === null);
  }, [entryKey, invalidate]);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (spinRef.current !== null) {
      entry.current = null;
      group.current.scale.setScalar(0.1);
      group.current.rotation.y = spinRef.current;
      group.current.position.y = 0;
      return;
    }
    // Entrance: grows from 88 % and settles from a quarter turn, with a soft
    // overshoot. Only runs for ~0.75 s after a load, then the scene is still.
    if (entry.current !== null) {
      if (entry.current < 0) entry.current = performance.now();
      const t = Math.min(1, (performance.now() - entry.current) / (ENTRY_SECONDS * 1000));
      const c = 1.4;
      const back = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
      const out = 1 - Math.pow(1 - t, 3);
      group.current.scale.setScalar(0.1 * (0.88 + 0.12 * back));
      group.current.rotation.y = (1 - out) * -0.9;
      if (t >= 1) {
        entry.current = null;
        onEntryEnd?.();
        group.current.scale.setScalar(0.1);
        group.current.rotation.y = 0;
      }
      state.invalidate();
      return;
    }
    const time = state.clock.elapsedTime;
    const step = Math.min(delta, 1 / 30);
    if (settings.autoRotate) {
      if (settings.motion === "turn") {
        group.current.rotation.y += step * settings.rotateSpeed * 0.85;
      } else {
        group.current.rotation.y = Math.sin(time * settings.rotateSpeed * 0.55) * 0.42;
      }
      // Gentle float only while the turntable runs; at rest the scene is still, so nothing re-renders.
      group.current.position.y = Math.sin(time * 0.75) * 0.06;
    } else {
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, 0, 6, step);
      group.current.position.y = THREE.MathUtils.damp(group.current.position.y, 0, 6, step);
      if (Math.abs(group.current.rotation.y) > 1e-4 || Math.abs(group.current.position.y) > 1e-4) {
        state.invalidate();
      }
    }
  });

  if (!icon) return null;

  return (
    <group ref={group} scale={0.1}>
      <primitive object={icon.group} />
    </group>
  );
}

/** Gradient "room" baked into the environment map, behind the light panels. */
export function SkyDome({ sky }: { sky: LightRigDef["sky"] }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      // Front faces seen from the default 3/4 view reflect just below the
      // horizon, so the falloff lives there: it paints a soft light-to-dark
      // sweep across flat caps instead of a uniform black or white plate.
      gradient.addColorStop(0, sky.top);
      gradient.addColorStop(0.3, sky.top);
      gradient.addColorStop(0.47, sky.horizon);
      gradient.addColorStop(0.66, sky.bottom);
      gradient.addColorStop(1, sky.bottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 4, 256);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [sky.top, sky.horizon, sky.bottom]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh scale={60}>
      <sphereGeometry args={[1, 48, 24]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        color={[sky.intensity, sky.intensity, sky.intensity]}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/** CC0 studio HDRI (Poly Haven, "Studio Small 09" by Sergej Majboroda). */
export const STUDIO_HDRI = "/hdri/studio_small_09_1k.hdr";

/** The photographed studio wrapped around the scene as a dome, with adjustable brightness. */
function HdriDome({ texture, intensity, rotation }: { texture: THREE.Texture; intensity: number; rotation: number }) {
  return (
    <mesh scale={60} rotation={[0, rotation, 0]}>
      <sphereGeometry args={[1, 64, 32]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        color={[intensity, intensity, intensity]}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Centre of the front sweep: low and slightly left, so it covers both the 3/4 and the straight-on views. */
const FRONT_SWEEP_DIR = new THREE.Vector3(-0.15, -0.45, 1).normalize();

/**
 * Additive radial softbox facing the object from the front-low-left, so front
 * caps on metal and glass catch a light falloff instead of the dark floor of the room.
 */
function FrontSweep({ color, intensity }: { color: string; intensity: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.35, "rgba(255,255,255,0.75)");
      g.addColorStop(0.7, "rgba(255,255,255,0.22)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const tint = useMemo(() => new THREE.Color(color).multiplyScalar(intensity), [color, intensity]);
  const position = useMemo(() => FRONT_SWEEP_DIR.clone().multiplyScalar(14).toArray(), []);
  return (
    <Lightformer position={position} scale={[50, 30, 1]} target={[0, 0, 0]}>
      <meshBasicMaterial
        map={texture}
        color={tint}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </Lightformer>
  );
}

/**
 * Procedural photo studio (three's RoomEnvironment): a light grey room with
 * soft box lights. Reflections read as smooth light-to-grey falloffs, the
 * calm "packshot" look, instead of the high-contrast patches of a real HDRI.
 */
function RoomDome({ intensity, rotation }: { intensity: number; rotation: number }) {
  const room = useMemo(() => new RoomEnvironment(), []);
  useEffect(() => () => room.dispose(), [room]);
  useEffect(() => {
    room.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial | undefined;
      if (!material || !("color" in material)) return;
      material.userData.baseColor ??= material.color.clone();
      material.color.copy(material.userData.baseColor as THREE.Color).multiplyScalar(intensity);
    });
  }, [room, intensity]);
  return <primitive object={room} rotation={[0, rotation, 0]} />;
}

type RigEnvironmentProps = {
  rig: LightRigDef;
  resolution: number;
  /** Degrees; walks the light panels (and the HDRI) around the object. */
  angle: number;
  power: number;
};

function RigEnvironmentContent({ rig, resolution, angle, power, hdr }: RigEnvironmentProps & { hdr: THREE.Texture | null }) {
  const rad = (angle * Math.PI) / 180;
  const invalidate = useThree((state) => state.invalidate);
  // The environment changes outside React's view of the scene: ask on-demand canvases to redraw.
  useEffect(() => {
    invalidate();
  }, [hdr, rig, angle, power, invalidate]);
  return (
    <Environment key={`${rig.id}-${angle}-${power}-${resolution}-${hdr ? "hdr" : "sky"}`} resolution={resolution} frames={1}>
      <color attach="background" args={[rig.ambientColor]} />
      {rig.room ? (
        <RoomDome intensity={rig.room.intensity} rotation={rig.room.rotation + rad} />
      ) : hdr && rig.hdri ? (
        <HdriDome texture={hdr} intensity={rig.hdri.intensity} rotation={rig.hdri.rotation + rad} />
      ) : (
        <SkyDome sky={rig.sky} />
      )}
      <group rotation={[0, rad, 0]}>
        {rig.front && <FrontSweep color={rig.front.color} intensity={rig.front.intensity * power} />}
        {rig.panels.map((panel, index) => (
          <Lightformer
            key={index}
            form={panel.form}
            intensity={
              panel.intensity * power * (rig.room ? rig.room.panelScale : hdr ? (rig.hdri?.panelScale ?? 1) : 1)
            }
            position={panel.position}
            rotation={panel.rotation ?? [0, 0, 0]}
            scale={panel.scale}
            color={panel.color}
          />
        ))}
      </group>
    </Environment>
  );
}

function RigEnvironmentWithHdr(props: RigEnvironmentProps) {
  const hdr = useLoader(HDRLoader, STUDIO_HDRI);
  return <RigEnvironmentContent {...props} hdr={hdr} />;
}

/**
 * The reflected world: a real photographed studio (for rigs that use one) or a
 * gradient room, plus the rig's softbox and strip panels. While the HDRI loads,
 * the gradient version stands in, so the object is never unlit.
 */
export function RigEnvironment(props: RigEnvironmentProps) {
  const fallback = <RigEnvironmentContent {...props} hdr={null} />;
  if (!props.rig.hdri || props.rig.room) return fallback;
  return (
    <Suspense fallback={fallback}>
      <RigEnvironmentWithHdr {...props} />
    </Suspense>
  );
}

function LightRig({ settings, resolution }: { settings: SceneSettings; resolution: number }) {
  const rig = rigById(settings.rig);
  const power = settings.studioLight;
  const exposure = settings.exposure;
  return (
    <>
      <ambientLight intensity={rig.ambient * exposure} />
      <directionalLight
        position={rig.key.position}
        intensity={rig.key.intensity * power * exposure}
        color={rig.key.color}
      />
      <directionalLight
        position={rig.fill.position}
        intensity={rig.fill.intensity * power * exposure}
        color={rig.fill.color}
      />
      <RigEnvironment rig={rig} resolution={resolution} angle={settings.lightAngle} power={power} />
    </>
  );
}

/**
 * Soft area shadow: a ring of randomised shadow-casting lights accumulated over
 * many frames, like a large softbox overhead. Far more natural than a blurred
 * contact shadow; it keeps accumulating while the object moves.
 *
 * Memoised on purpose: drei's AccumulativeShadows resets its light map in a
 * layout effect on *every* render, so any unrelated re-render of the studio
 * (a toast, a panel animation) restarted the accumulation and flashed the grey
 * shadow plane for a second. It now re-renders only when its own props change.
 */
const SoftShadow = memo(function SoftShadow({
  icon,
  floorY,
  opacity,
  live,
  angle,
}: {
  icon: BuiltIcon;
  floorY: number;
  opacity: number;
  live: boolean;
  angle: number;
}) {
  const span = Math.max(icon.size.x, icon.size.y, icon.size.z) * 0.1;
  const rad = (angle * Math.PI) / 180;
  const shadowKey = `${icon.triangles}-${icon.size.x.toFixed(1)}-${icon.size.z.toFixed(1)}-${live}-${angle}`;
  return (
    <>
    {/* With on-demand rendering, drei's self-invalidation can stall mid-way and
        leave a half-accumulated grey plane: keep frames coming until it settles. */}
    <KeepRendering key={`keep-${shadowKey}`} ms={4500} />
    <AccumulativeShadows
      key={shadowKey}
      temporal
      frames={live ? Infinity : 90}
      blend={live ? 24 : 90}
      // A high alpha test drops the faint grazing-angle haze so the plane's edge never shows.
      alphaTest={0.9}
      opacity={opacity * 1.15}
      scale={span * 2.4}
      position={[0, floorY + 0.005, 0]}
      color="#000000"
      colorBlend={2}
    >
      <RandomizedLight
        amount={8}
        radius={span * 0.45}
        ambient={0.2}
        // Bright enough that every unshadowed texel saturates to fully transparent.
        intensity={1.8}
        size={span * 1.6}
        mapSize={1024}
        bias={0.002}
        position={[Math.sin(rad) * span * 0.5, span * 1.4, Math.cos(rad) * span * 0.5]}
      />
    </AccumulativeShadows>
    </>
  );
});

/** Keeps frames coming for `ms` after mounting (see keepFrames). */
function KeepRendering({ ms }: { ms: number }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => keepFrames(invalidate, ms), [invalidate, ms]);
  return null;
}

function Floor({
  icon,
  settings,
  shadowResolution,
  live,
}: {
  icon: BuiltIcon | null;
  settings: SceneSettings;
  shadowResolution: number;
  live: boolean;
}) {
  const fade = useMemo(() => createFloorFade(), []);
  useEffect(() => () => fade?.dispose(), [fade]);
  const floorY = icon ? -(icon.size.y * 0.1) / 2 - 0.6 : -6;
  if (settings.floor === "none") return null;

  if (settings.floor === "soft") {
    return icon ? (
      <group name="studio-floor">
        <SoftShadow
          icon={icon}
          floorY={floorY}
          opacity={settings.shadow}
          live={live}
          angle={settings.lightAngle}
        />
      </group>
    ) : null;
  }

  return (
    <group name="studio-floor">
      {settings.floor === "reflect" && (
        <mesh
          name="studio-reflector"
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, floorY - 0.01, 0]}
        >
          <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
          <MeshReflectorMaterial
            color={settings.floorColor}
            blur={[400, 120]}
            // The reflection is blurred anyway; a smaller buffer is visually identical and far cheaper.
            resolution={Math.min(shadowResolution, 768)}
            mixBlur={1}
            mixStrength={18}
            mixContrast={1}
            roughness={0.9}
            metalness={0.25}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            mirror={0.6}
            transparent
            alphaMap={fade ?? undefined}
          />
        </mesh>
      )}
      <ContactShadows
        key={icon ? `${icon.triangles}-${icon.size.x}-${settings.autoRotate}` : "empty"}
        position={[0, floorY, 0]}
        opacity={settings.shadow * 0.85}
        scale={26}
        blur={2.6}
        far={16}
        resolution={shadowResolution}
        color="#000000"
        frames={settings.autoRotate ? Infinity : 1}
      />
    </group>
  );
}

function Effects({
  settings,
  composerRef,
  msaa,
}: {
  settings: SceneSettings;
  composerRef: React.RefObject<EffectComposerImpl | null>;
  msaa: number;
}) {
  const offset = useMemo(
    () => new THREE.Vector2(settings.aberration * 0.0016, settings.aberration * 0.0016),
    [settings.aberration],
  );
  const hasBloom = settings.bloom > 0.001;
  const hasAberration = settings.aberration > 0.001;
  const hasGrain = settings.grain > 0.001;

  return (
    <EffectComposer
      key={`${hasBloom}-${hasAberration}-${hasGrain}-${msaa}`}
      ref={composerRef}
      multisampling={msaa}
      frameBufferType={THREE.HalfFloatType}
    >
      <>
        {hasBloom && (
          <Bloom
            mipmapBlur
            intensity={settings.bloom * 1.4}
            luminanceThreshold={0.82}
            luminanceSmoothing={0.25}
            radius={0.72}
          />
        )}
        {hasAberration && (
          <ChromaticAberration offset={offset} radialModulation modulationOffset={0.35} />
        )}
        <ToneMapping mode={postToneMap[settings.toneMap]} />
        {hasGrain && (
          <Noise premultiply opacity={settings.grain * 0.5} blendFunction={BlendFunction.SOFT_LIGHT} />
        )}
      </>
    </EffectComposer>
  );
}

function Bridge({
  actionsRef,
  icon,
  sizeName,
  composerRef,
  stageRef,
  spinRef,
  setRecording,
}: {
  actionsRef: ActionsRef;
  icon: BuiltIcon | null;
  sizeName: string;
  composerRef: React.RefObject<EffectComposerImpl | null>;
  stageRef: React.RefObject<StageHandle | null>;
  spinRef: React.RefObject<number | null>;
  setRecording: (recording: boolean) => void;
}) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const advance = useThree((state) => state.advance);
  const setFrameloop = useThree((state) => state.setFrameloop);
  const getState = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const baseName = sizeName.replace(/\.[^.]+$/, "") || "solidwave";

    const exportPng = async ({ size, paint }: PngExportOptions) => {
      if (!icon) return;
      const composer = composerRef.current;
      const maxSize = Math.min(gl.capabilities.maxTextureSize, 8192);
      // Supersample small exports for cleaner edges; large ones are already dense.
      const supersample = size <= 1024 ? 2 : 1;
      const renderSize = Math.min(size * supersample, maxSize);

      const previousSize = gl.getSize(new THREE.Vector2());
      const previousRatio = gl.getPixelRatio();
      const previousAspect = camera.aspect;
      const reflector = scene.getObjectByName("studio-reflector");
      const reflectorVisible = reflector?.visible ?? false;
      // A transparent PNG can't carry an opaque mirror floor; keep only the soft shadow.
      if (reflector && !paint) reflector.visible = false;

      const restore = () => {
        gl.setPixelRatio(previousRatio);
        if (composer) composer.setSize(previousSize.x, previousSize.y, false);
        else gl.setSize(previousSize.x, previousSize.y, false);
        camera.aspect = previousAspect;
        camera.updateProjectionMatrix();
        if (reflector) reflector.visible = reflectorVisible;
        stageRef.current?.repaint(previousSize.x, previousSize.y);
      };

      try {
        gl.setPixelRatio(1);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        // The glass refracts the stage: repaint it square so it isn't stretched.
        stageRef.current?.repaint(renderSize, renderSize);
        if (composer) {
          composer.setSize(renderSize, renderSize, false);
          gl.setClearColor(0x000000, 0);
          // Render twice so the transmission and reflection buffers settle at the new size.
          composer.render(0);
          composer.render(0);
        } else {
          gl.setSize(renderSize, renderSize, false);
          gl.setClearColor(0x000000, 0);
          gl.render(scene, camera);
          gl.render(scene, camera);
        }

        const out = document.createElement("canvas");
        out.width = out.height = size;
        const ctx = out.getContext("2d");
        if (!ctx) throw new Error("2D canvas unavailable");
        if (paint) paint(ctx, size);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(gl.domElement, 0, 0, renderSize, renderSize, 0, 0, size, size);
        restore();

        const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("PNG encoding failed");
        download(blob, `${baseName}-${size}.png`);
      } catch (error) {
        restore();
        throw error;
      }
    };

    const exportVideo = async ({ aspect, seconds, paint, onProgress }: VideoExportOptions) => {
      if (!icon) throw new Error("Nothing to record");
      const [width, height] = videoSizes[aspect];
      const fps = 60;
      const frameCount = Math.round(seconds * fps);

      // Frame-accurate path: WebCodecs H.264 + MP4 muxing. Every frame is rendered
      // and encoded at an exact 1/60 s timestamp, so the loop is perfectly smooth
      // however long each frame takes to render.
      const encoderConfig = await pickH264Config(width, height, fps);
      const recorderMime = encoderConfig
        ? null
        : ["video/mp4;codecs=avc1.640028", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find(
            (type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type),
          );
      if (!encoderConfig && !recorderMime) throw new Error("This browser cannot record video");

      // The backdrop never changes during the loop: paint it once.
      const backdrop = document.createElement("canvas");
      backdrop.width = width;
      backdrop.height = height;
      const backdropCtx = backdrop.getContext("2d");
      const out = document.createElement("canvas");
      out.width = width;
      out.height = height;
      const ctx = out.getContext("2d");
      if (!backdropCtx || !ctx) throw new Error("2D canvas unavailable");
      paint(backdropCtx, width, height);

      const composer = composerRef.current;
      const previousSize = gl.getSize(new THREE.Vector2());
      const previousRatio = gl.getPixelRatio();
      const previousAspect = camera.aspect;
      const previousLoop = getState().frameloop;

      // Take over the render loop so every frame is rendered exactly once, at video size.
      setFrameloop("never");
      setRecording(true);
      gl.setPixelRatio(1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (composer) composer.setSize(width, height, false);
      else gl.setSize(width, height, false);
      stageRef.current?.repaint(width, height);

      const restore = () => {
        spinRef.current = null;
        gl.setPixelRatio(previousRatio);
        if (composer) composer.setSize(previousSize.x, previousSize.y, false);
        else gl.setSize(previousSize.x, previousSize.y, false);
        camera.aspect = previousAspect;
        camera.updateProjectionMatrix();
        stageRef.current?.repaint(previousSize.x, previousSize.y);
        setRecording(false);
        setFrameloop(previousLoop);
        invalidate();
      };

      const start = performance.now();
      const renderFrame = (index: number) => {
        spinRef.current = (index / frameCount) * Math.PI * 2;
        advance(start + (index * 1000) / fps);
        // Let the GPU finish this frame before it is copied, so frames don't pile up behind the encoder.
        gl.getContext().finish();
        ctx.drawImage(backdrop, 0, 0);
        ctx.drawImage(gl.domElement, 0, 0, width, height, 0, 0, width, height);
      };

      let video: Blob;
      let extension: string;
      try {
        // Warm-up frames let soft shadows and reflections settle before recording.
        for (let i = 0; i < 12; i++) renderFrame(0);

        if (encoderConfig) {
          const muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: { codec: "avc", width, height, frameRate: fps },
            fastStart: "in-memory",
          });
          let failure: unknown = null;
          const encoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (error) => {
              failure = error;
            },
          });
          encoder.configure(encoderConfig);
          const frameDuration = 1_000_000 / fps;
          // Frame index 0 … n-1: the last frame stops one step short of 360°, so the loop is seamless.
          for (let index = 0; index < frameCount; index++) {
            if (failure) throw failure;
            renderFrame(index);
            const frame = new VideoFrame(out, {
              timestamp: Math.round(index * frameDuration),
              duration: Math.round(frameDuration),
            });
            encoder.encode(frame, { keyFrame: index % (fps * 2) === 0 });
            frame.close();
            // Keep the encoder queue short (rendering is far faster than encoding).
            // A failed encoder never drains its queue: stop waiting on it.
            while (encoder.encodeQueueSize > 6 && !failure && encoder.state === "configured") await wait(4);
            // Report progress (and let the page breathe) a few times a second, not
            // every frame: each update re-renders the whole studio.
            if (index % 8 === 7 || index === frameCount - 1) {
              onProgress?.((index + 1) / frameCount);
              await wait(0);
            }
          }
          await withTimeout(encoder.flush(), 60_000);
          encoder.close();
          if (failure) throw failure;
          muxer.finalize();
          video = new Blob([muxer.target.buffer], { type: "video/mp4" });
          extension = "mp4";
        } else {
          const mime = recorderMime as string;
          const stream = out.captureStream(fps);
          const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 24_000_000 });
          const chunks: Blob[] = [];
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunks.push(event.data);
          };
          const stopped = new Promise<void>((resolve) => {
            recorder.onstop = () => resolve();
          });
          recorder.start(250);
          // Fallback: paced to real time, one frame per display refresh.
          for (let index = 0; index < frameCount; index++) {
            renderFrame(index);
            onProgress?.((index + 1) / frameCount);
            await new Promise((resolve) => requestAnimationFrame(resolve));
          }
          recorder.stop();
          await stopped;
          stream.getTracks().forEach((track) => track.stop());
          video = new Blob(chunks, { type: mime.split(";")[0] });
          extension = mime.startsWith("video/mp4") ? "mp4" : "webm";
        }
      } finally {
        restore();
      }

      // Some environments accept a codec but never emit data; never ship an empty file.
      if (video.size === 0) throw new Error("This browser produced no video data");
      download(video, `${baseName}-turntable.${extension}`);
      return extension;
    };

    const exportGlb = async () => {
      if (!icon) return;
      const clone = icon.group.clone(true);
      clone.scale.setScalar(0.001);
      clone.position.set(0, 0, 0);
      clone.updateMatrixWorld(true);
      const exporter = new GLTFExporter();
      const result = await exporter.parseAsync(clone, { binary: true });
      download(new Blob([result as ArrayBuffer], { type: "model/gltf-binary" }), `${baseName}.glb`);
    };

    const exportStl = async () => {
      if (!icon) return;
      const clone = icon.group.clone(true);
      clone.scale.setScalar(1);
      clone.updateMatrixWorld(true);
      const data = new STLExporter().parse(clone, { binary: true });
      download(new Blob([data.buffer as ArrayBuffer], { type: "model/stl" }), `${baseName}.stl`);
    };

    actionsRef.current = { exportPng, exportVideo, exportGlb, exportStl };
  }, [
    actionsRef,
    icon,
    gl,
    scene,
    camera,
    sizeName,
    composerRef,
    stageRef,
    spinRef,
    setRecording,
    advance,
    setFrameloop,
    getState,
    invalidate,
  ]);

  return null;
}

type IconCanvasProps = {
  icon: BuiltIcon | null;
  material: MaterialSettings;
  settings: SceneSettings;
  actionsRef: ActionsRef;
  sizeName: string;
  fitTick: number;
  onStats?: (stats: { width: number; height: number; depth: number; triangles: number }) => void;
  /** Paints the stage backdrop; used so glass refracts what's behind it. */
  paintStage?: StagePainter;
  /** Changes whenever the painted stage would look different. */
  stageKey?: string;
  /** Bumped when a new file or shape loads: the object plays its entrance. */
  entryKey?: number;
};

export function IconCanvas({
  icon,
  material,
  settings,
  actionsRef,
  sizeName,
  fitTick,
  onStats,
  paintStage,
  stageKey,
  entryKey = 0,
}: IconCanvasProps) {
  const [artworkTexture, setArtworkTexture] = useState<THREE.Texture | null>(null);
  const composerRef = useRef<EffectComposerImpl | null>(null);
  const stageRef = useRef<StageHandle | null>(null);
  const spinRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  // While the entrance plays the soft shadow follows the moving object; when it
  // ends the shadow re-accumulates once for the resting pose (no smeared shadow).
  const [entering, setEntering] = useState(false);
  const [seenEntry, setSeenEntry] = useState(entryKey);
  if (entryKey !== seenEntry) {
    setSeenEntry(entryKey);
    setEntering(true);
  }
  // Safety net only: the model reports the end of its entrance itself.
  useEffect(() => {
    if (!entering) return;
    const timer = window.setTimeout(() => setEntering(false), 8000);
    return () => window.clearTimeout(timer);
  }, [entering, entryKey]);
  const budget = qualityBudget[settings.quality];

  // The logo's own colours, cropped to the outline of the current object.
  const artworkCrop = icon?.artworkCrop ?? null;
  const outlineKey = (icon?.outlineUV ?? []).reduce((sum, loop) => sum + loop.length * 7 + (loop[0]?.[0] ?? 0), 0);
  const cropKey = artworkCrop
    ? `${artworkCrop.u0.toFixed(5)}-${artworkCrop.v0.toFixed(5)}-${artworkCrop.u1.toFixed(5)}-${artworkCrop.v1.toFixed(5)}-${outlineKey.toFixed(4)}`
    : `full-${outlineKey.toFixed(4)}`;
  useEffect(() => {
    const url = material.artworkUrl;
    // Photo objects carry their own texture: nothing to crop or load.
    if (!url || !icon || icon.photoMap) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the texture when the option is turned off
      setArtworkTexture(null);
      return;
    }
    let active = true;
    let texture: THREE.Texture | null = null;
    loadHtmlImage(url)
      .then((image) => {
        if (!active) return;
        texture = createArtworkTexture(image, artworkCrop, icon?.outlineUV ?? []);
        setArtworkTexture(texture);
      })
      .catch(() => {
        if (active) setArtworkTexture(null);
      });
    return () => {
      active = false;
      texture?.dispose();
    };
    // The crop is tracked through its key: a rebuilt icon with the same outline keeps the texture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.artworkUrl, cropKey, !!icon, !!icon?.photoMap]);

  const photoMap = icon?.photoMap ?? null;
  const threeMaterial = useMemo(
    () =>
      createMaterial(material.finish, {
        tint: material.tint,
        metalness: material.metalness,
        roughness: material.roughness,
        transmission: material.transmission,
        thickness: material.thickness,
        ior: material.ior,
        dispersion: material.dispersion,
        iridescence: material.iridescence,
        clearcoat: material.clearcoat,
        attenuationColor: material.attenuationColor,
        attenuationDistance: material.attenuationDistance,
        artworkMap: material.artworkUrl ? (photoMap ?? artworkTexture) : null,
      }),
    [
      material.finish,
      material.tint,
      material.metalness,
      material.roughness,
      material.transmission,
      material.thickness,
      material.ior,
      material.dispersion,
      material.iridescence,
      material.clearcoat,
      material.attenuationColor,
      material.attenuationDistance,
      material.artworkUrl,
      artworkTexture,
      photoMap,
    ],
  );

  // One material object for the life of the canvas: new settings are copied
  // into it instead of swapping materials. drei's AccumulativeShadows records
  // each mesh's material when it resets and puts that object back after every
  // accumulation frame, so a swapped-in material would silently be reverted.
  const [surface] = useState(() => new THREE.MeshPhysicalMaterial());
  useLayoutEffect(() => {
    surface.copy(threeMaterial);
    surface.needsUpdate = true;
  }, [surface, threeMaterial]);
  useEffect(() => () => surface.dispose(), [surface]);
  // Assigned during render so it is in place before the shadow pass records it.
  if (icon) for (const mesh of icon.meshes) if (mesh.material !== surface) mesh.material = surface;

  useEffect(() => () => threeMaterial.dispose(), [threeMaterial]);

  useEffect(() => {
    if (!icon || !onStats) return;
    onStats({
      width: icon.size.x,
      height: icon.size.y,
      depth: icon.size.z,
      triangles: icon.triangles,
    });
  }, [icon, onStats]);

  return (
    <Canvas
      shadows="percentage"
      // Render only when something changes, unless the scene is genuinely animating.
      // While recording, the exporter drives every frame itself.
      frameloop={recording ? "never" : settings.autoRotate ? "always" : "demand"}
      dpr={budget.dpr}
      gl={{
        antialias: !budget.post,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 0, 24], fov: settings.lens, near: 0.1, far: 2000 }}
      className="!absolute inset-0"
    >
      <Settle
        token={`${icon?.triangles ?? 0}-${icon?.size.x ?? 0}-${icon?.size.y ?? 0}-${icon?.size.z ?? 0}-${threeMaterial.uuid}-${stageKey ?? ""}-${JSON.stringify(settings)}`}
        frames={settings.floor === "soft" ? 110 : 6}
      />
      <RendererSettings toneMap={settings.toneMap} post={budget.post} />
      <Exposure exposure={settings.exposure} />
      <EnvBinding material={surface} exposure={settings.exposure} />
      <CameraRig view={settings.view} lens={settings.lens} icon={icon} fitTick={fitTick} />
      <LightRig settings={settings} resolution={budget.env} />
      <StageBackdrop paint={paintStage} paintKey={stageKey} handleRef={stageRef} />
      <IconModel
        icon={icon}
        settings={settings}
        spinRef={spinRef}
        entryKey={entryKey}
        onEntryEnd={() => setEntering(false)}
      />
      <Floor
        icon={icon}
        settings={settings}
        shadowResolution={budget.shadow}
        live={settings.autoRotate || recording || entering}
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={90}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI - 0.05}
      />
      {budget.post && <Effects settings={settings} composerRef={composerRef} msaa={budget.msaa} />}
      <Bridge
        actionsRef={actionsRef}
        icon={icon}
        sizeName={sizeName}
        composerRef={composerRef}
        stageRef={stageRef}
        spinRef={spinRef}
        setRecording={setRecording}
      />
    </Canvas>
  );
}
