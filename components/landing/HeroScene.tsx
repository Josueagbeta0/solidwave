"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
} from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SampleIcon } from "@/components/SampleIcon";
import { sampleById, sampleSvg, type SampleId } from "@/lib/samples";
import { buildIcon, disposeIcon } from "@/lib/studio/geometry";
import { rigById } from "@/lib/studio/lighting";
import { SkyDome, StageBackdrop } from "@/components/studio/IconCanvas";
import { createFloorFade, FLOOR_SIZE } from "@/lib/studio/floor";
import { createMaterial, finishById } from "@/lib/studio/materials";
import { svgToShapes } from "@/lib/trace";

function useIcon(sampleId: SampleId) {
  const icon = useMemo(() => {
    const sample = sampleById(sampleId);
    const trace = svgToShapes(sampleSvg(sample));
    if (!trace) return null;
    const width = 46;
    const height = Math.max(8, (width * trace.height) / trace.width);
    const scale = Math.min(1, 46 / height);
    return buildIcon(trace, {
      mode: "extrude",
      widthMm: width * scale,
      heightMm: height * scale,
      depthMm: 10,
      edgeMm: 2.4,
      quality: "high",
    });
  }, [sampleId]);

  useEffect(() => () => disposeIcon(icon), [icon]);
  return icon;
}

function Hero3D({ sampleId, finishId }: { sampleId: SampleId; finishId: string }) {
  const icon = useIcon(sampleId);
  const group = useRef<THREE.Group>(null);
  const spin = useRef(0);

  useEffect(() => {
    if (!icon) return;
    const finish = finishById(finishId);
    const material = createMaterial(finish, {
      transmission: finish.group === "glass" || finish.group === "liquid" ? 1 : undefined,
    });
    for (const mesh of icon.meshes) mesh.material = material;
    spin.current = 0.9;
    return () => material.dispose();
  }, [icon, finishId]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    // A little flourish whenever the shape or finish changes.
    spin.current = THREE.MathUtils.damp(spin.current, 0, 2.4, delta);
    group.current.rotation.y =
      Math.sin(t * 0.5) * 0.5 + state.pointer.x * 0.35 + spin.current * Math.PI * 2 * 0.25;
    group.current.rotation.x = -0.08 - state.pointer.y * 0.12;
    group.current.position.y = 0.5 + Math.sin(t * 0.9) * 0.12;
  });

  if (!icon) return null;
  return (
    <group ref={group} scale={0.1}>
      <primitive object={icon.group} />
    </group>
  );
}

/** Mirrors the hero card's CSS gradient so the glass refracts what sits behind it. */
const paintHeroCard = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const gradient = ctx.createRadialGradient(width / 2, height * 0.2, 0, width / 2, height * 0.2, Math.max(width, height) * 0.8);
  gradient.addColorStop(0, "#1e1f5c");
  gradient.addColorStop(0.55, "#0a0b1e");
  gradient.addColorStop(1, "#05060d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width / 2, height * 0.48, 0, width / 2, height * 0.48, Math.min(width, height) * 0.4);
  glow.addColorStop(0, "#5b7cff55");
  glow.addColorStop(1, "#5b7cff00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
};

function Stage() {
  const rig = rigById("wave");
  const fade = useMemo(() => createFloorFade(6, 22), []);
  useEffect(() => () => fade?.dispose(), [fade]);
  return (
    <>
      <ambientLight intensity={rig.ambient} />
      <directionalLight position={rig.key.position} intensity={rig.key.intensity * 1.4} color={rig.key.color} />
      <directionalLight position={rig.fill.position} intensity={rig.fill.intensity * 1.4} color={rig.fill.color} />
      <Environment resolution={512} frames={1}>
        <color attach="background" args={[rig.ambientColor]} />
        <SkyDome sky={rig.sky} />
        {rig.panels.map((panel, index) => (
          <Lightformer
            key={index}
            form={panel.form}
            intensity={panel.intensity * 1.4}
            position={panel.position}
            rotation={panel.rotation ?? [0, 0, 0]}
            scale={panel.scale}
            color={panel.color}
          />
        ))}
      </Environment>
      <StageBackdrop paint={paintHeroCard} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.1, 0]}>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <MeshReflectorMaterial
          color="#07081a"
          blur={[400, 120]}
          resolution={1024}
          mixBlur={1}
          mixStrength={22}
          roughness={0.9}
          metalness={0.5}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          mirror={0.7}
          transparent
          alphaMap={fade ?? undefined}
        />
      </mesh>
      <ContactShadows position={[0, -3.08, 0]} opacity={0.7} scale={20} blur={2.4} far={10} frames={Infinity} />
    </>
  );
}

const shapeOptions: SampleId[] = ["solidwave", "spark", "heart", "bolt", "ring", "gem"];
const finishOptions = [
  { id: "holo", label: "Holo" },
  { id: "clear", label: "Glass" },
  { id: "prism", label: "Prism" },
  { id: "chrome", label: "Chrome" },
  { id: "gold", label: "Gold" },
  { id: "black-metal", label: "Black" },
];

export function HeroScene() {
  const [sampleId, setSampleId] = useState<SampleId>("solidwave");
  const [finishId, setFinishId] = useState("holo");
  const [visible, setVisible] = useState(true);
  const wrapper = useRef<HTMLDivElement>(null);

  // Pause rendering when the hero scrolls out of view.
  useEffect(() => {
    const node = wrapper.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "120px",
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapper} className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 1.6, 17], fov: 30, near: 0.1, far: 200 }}
        className="!absolute inset-0"
      >
        <Stage />
        <Hero3D sampleId={sampleId} finishId={finishId} />
        <EffectComposer multisampling={4} frameBufferType={THREE.HalfFloatType}>
          <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.8} luminanceSmoothing={0.25} radius={0.7} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4">
        <div role="group" aria-label="Shape" className="pointer-events-auto flex items-center gap-1">
          {shapeOptions.map((id) => {
            const sample = sampleById(id);
            const active = id === sampleId;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                aria-label={sample.name}
                title={sample.name}
                onClick={() => setSampleId(id)}
                className={`focus-ring grid size-9 place-items-center rounded-xl transition-colors [--ring-offset:2px] ${
                  active ? "bg-white/12 text-ink" : "text-ink-3 hover:bg-white/6 hover:text-ink"
                }`}
              >
                <SampleIcon sample={sample} size={17} />
              </button>
            );
          })}
        </div>
        <div
          role="group"
          aria-label="Finish"
          className="glass pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1 no-scrollbar"
        >
          {finishOptions.map((option) => {
            const item = finishById(option.id);
            const active = finishId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                aria-label={option.label}
                onClick={() => setFinishId(option.id)}
                className={`focus-ring flex h-9 shrink-0 items-center gap-2 rounded-full pl-1 transition-[background,padding] duration-300 [--ring-offset:2px] ${
                  active ? "bg-white/10 pr-3" : "pr-1 hover:bg-white/5"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="block size-7 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]"
                  style={{ background: item.swatch }}
                />
                {active && <span className="text-[13px] font-medium text-ink">{option.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
