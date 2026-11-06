"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
import { useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { GLTFExporter, STLExporter } from "three-stdlib";
import { createMaterial } from "@/lib/studio/materials";
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
  angle: new THREE.Vector3(0.62, 0.3, 1).normalize(),
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
  const animation = useRef<{ from: THREE.Vector3; to: THREE.Vector3; progress: number } | null>(
    null,
  );
  const hasMounted = useRef(false);

  const distance = useMemo(() => {
    const max = icon ? Math.max(icon.size.x, icon.size.y, icon.size.z) * 0.1 : 10;
    const fov = THREE.MathUtils.degToRad(lens);
    // Leave breathing room around the object, like a product shot.
    return (max / (2 * Math.tan(fov / 2))) * 1.8 + 2.5;
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
    const cancel = () => {
      animation.current = null;
    };
    controls.addEventListener("start", cancel);
    return () => controls.removeEventListener("start", cancel);
  }, [view, distance, controls, camera, fitTick]);

  useFrame((_, delta) => {
    if (!animation.current) return;
    animation.current.progress = Math.min(1, animation.current.progress + delta * 3.6);
    const t = 1 - Math.pow(1 - animation.current.progress, 4);
    camera.position.lerpVectors(animation.current.from, animation.current.to, t);
    camera.lookAt(0, 0, 0);
    if (animation.current.progress >= 1) animation.current = null;
  });

  return null;
}

function IconModel({
  icon,
  settings,
  spinRef,
}: {
  icon: BuiltIcon | null;
  settings: SceneSettings;
  /** When set, the turntable angle is driven from outside (video recording). */
  spinRef: React.RefObject<number | null>;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (spinRef.current !== null) {
      group.current.rotation.y = spinRef.current;
      group.current.position.y = 0;
      return;
    }
    const time = state.clock.elapsedTime;
    if (settings.autoRotate) {
      if (settings.motion === "turn") {
        group.current.rotation.y += delta * settings.rotateSpeed * 0.85;
      } else {
        group.current.rotation.y = Math.sin(time * settings.rotateSpeed * 0.55) * 0.42;
      }
    } else {
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, 0, 6, delta);
    }
    group.current.position.y = Math.sin(time * 0.75) * 0.06;
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
      <Environment
        key={`${rig.id}-${settings.lightAngle}-${power}-${resolution}`}
        resolution={resolution}
        frames={1}
      >
        <color attach="background" args={[rig.ambientColor]} />
        <SkyDome sky={rig.sky} />
        <group rotation={[0, (settings.lightAngle * Math.PI) / 180, 0]}>
          {rig.panels.map((panel, index) => (
            <Lightformer
              key={index}
              form={panel.form}
              intensity={panel.intensity * power}
              position={panel.position}
              rotation={panel.rotation ?? [0, 0, 0]}
              scale={panel.scale}
              color={panel.color}
            />
          ))}
        </group>
      </Environment>
    </>
  );
}

/**
 * Soft area shadow: a ring of randomised shadow-casting lights accumulated over
 * many frames, like a large softbox overhead. Far more natural than a blurred
 * contact shadow; it keeps accumulating while the object moves.
 */
function SoftShadow({
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
  return (
    <AccumulativeShadows
      key={`${icon.triangles}-${icon.size.x.toFixed(1)}-${icon.size.z.toFixed(1)}-${live}-${angle}`}
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
  );
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
            resolution={shadowResolution}
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
      const mime = [
        "video/mp4;codecs=avc1.640028",
        "video/mp4",
        "video/webm;codecs=vp9",
        "video/webm",
      ].find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error("This browser cannot record video");
      const extension = mime.startsWith("video/mp4") ? "mp4" : "webm";

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

      // Take over the render loop so every frame is rendered exactly once, at video size.
      setFrameloop("never");
      setRecording(true);
      gl.setPixelRatio(1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (composer) composer.setSize(width, height, false);
      else gl.setSize(width, height, false);
      stageRef.current?.repaint(width, height);

      const stream = out.captureStream(60);
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 24_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      const restore = () => {
        spinRef.current = null;
        gl.setPixelRatio(previousRatio);
        if (composer) composer.setSize(previousSize.x, previousSize.y, false);
        else gl.setSize(previousSize.x, previousSize.y, false);
        camera.aspect = previousAspect;
        camera.updateProjectionMatrix();
        stageRef.current?.repaint(previousSize.x, previousSize.y);
        setRecording(false);
        setFrameloop("always");
      };

      try {
        // Warm-up frames let soft shadows and reflections settle before recording.
        for (let i = 0; i < 12; i++) {
          spinRef.current = 0;
          advance(performance.now());
        }
        recorder.start(250);
        const duration = seconds * 1000;
        const start = performance.now();
        await new Promise<void>((resolve) => {
          const tick = () => {
            // Wall-clock driven: on a slow GPU frames drop, but the loop keeps real speed.
            const t = Math.min(1, (performance.now() - start) / duration);
            spinRef.current = t * Math.PI * 2;
            advance(performance.now());
            ctx.drawImage(backdrop, 0, 0);
            ctx.drawImage(gl.domElement, 0, 0, width, height, 0, 0, width, height);
            onProgress?.(t);
            if (t >= 1) resolve();
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        recorder.stop();
        await stopped;
      } finally {
        if (recorder.state !== "inactive") recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
        restore();
      }

      const video = new Blob(chunks, { type: mime.split(";")[0] });
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
}: IconCanvasProps) {
  const [reliefTexture, setReliefTexture] = useState<THREE.Texture | null>(null);
  const composerRef = useRef<EffectComposerImpl | null>(null);
  const stageRef = useRef<StageHandle | null>(null);
  const spinRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const budget = qualityBudget[settings.quality];

  useEffect(() => {
    if (!material.reliefUrl || !icon?.relief) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the texture when relief is turned off
      setReliefTexture(null);
      return;
    }
    let active = true;
    const texture = new THREE.TextureLoader().load(material.reliefUrl, (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = 8;
      loaded.needsUpdate = true;
      if (active) setReliefTexture(loaded);
    });
    return () => {
      active = false;
      texture.dispose();
    };
  }, [material.reliefUrl, icon?.relief]);

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
        reliefMap: icon?.relief ? reliefTexture : null,
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
      icon?.relief,
      reliefTexture,
    ],
  );

  useEffect(() => {
    if (!icon) return;
    for (const mesh of icon.meshes) mesh.material = threeMaterial;
  }, [icon, threeMaterial]);

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
      <RendererSettings toneMap={settings.toneMap} post={budget.post} />
      <Exposure exposure={settings.exposure} />
      <CameraRig view={settings.view} lens={settings.lens} icon={icon} fitTick={fitTick} />
      <LightRig settings={settings} resolution={budget.env} />
      <StageBackdrop paint={paintStage} paintKey={stageKey} handleRef={stageRef} />
      <IconModel icon={icon} settings={settings} spinRef={spinRef} />
      <Floor
        icon={icon}
        settings={settings}
        shadowResolution={budget.shadow}
        live={settings.autoRotate || recording}
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
