"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SampleIcon } from "@/components/SampleIcon";
import { sampleById, sampleSvg, type SampleId } from "@/lib/samples";
import { buildIcon, disposeIcon } from "@/lib/studio/geometry";
import { rigById } from "@/lib/studio/lighting";
import { RigEnvironment, StageBackdrop } from "@/components/studio/IconCanvas";
import { createMaterial, finishById } from "@/lib/studio/materials";
import { svgToShapes } from "@/lib/trace";
import { paintHeroStage } from "@/lib/stage";

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
    // A little flourish whenever the shape or finish changes, then a slow sway that follows the pointer.
    spin.current = THREE.MathUtils.damp(spin.current, 0, 2.4, delta);
    const targetY = Math.sin(t * 0.45) * 0.45 + state.pointer.x * 0.4 + spin.current * Math.PI * 0.5;
    const targetX = -0.06 - state.pointer.y * 0.14;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetY, 5, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 5, delta);
    group.current.position.y = 0.45 + Math.sin(t * 0.9) * 0.1;
  });

  if (!icon) return null;
  return (
    <group ref={group} scale={0.1}>
      <primitive object={icon.group} />
    </group>
  );
}

/** Pulls the camera back on tall (portrait) stages so the object never overflows the width. */
function CameraFit() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));
  useEffect(() => {
    const distance = aspect >= 1.25 ? 16 : 16 * Math.min(2.2, 1.25 / aspect);
    camera.position.set(0, 1.4, distance);
    camera.lookAt(0, 0.3, 0);
    camera.updateProjectionMatrix();
  }, [camera, aspect]);
  return null;
}

function Stage() {
  const rig = rigById("studio");
  return (
    <>
      <ambientLight intensity={rig.ambient} />
      <directionalLight position={rig.key.position} intensity={rig.key.intensity * 1.5} color={rig.key.color} />
      <directionalLight position={rig.fill.position} intensity={rig.fill.intensity * 1.5} color={rig.fill.color} />
      <RigEnvironment rig={rig} resolution={512} angle={0} power={1.5} />
      <StageBackdrop paint={paintHeroStage} />
      <ContactShadows position={[0, -2.88, 0]} opacity={0.5} scale={16} blur={2.6} far={8} resolution={384} frames={Infinity} />
    </>
  );
}

const shapeOptions: SampleId[] = ["solidwave", "spark", "heart", "bolt", "ring", "gem"];
const finishOptions = [
  { id: "chrome", label: "Chrome" },
  { id: "clear", label: "Verre" },
  { id: "holo", label: "Holo" },
  { id: "gold", label: "Or" },
  { id: "sapphire", label: "Saphir" },
  { id: "black-metal", label: "Noir" },
];

export function HeroScene() {
  const [sampleId, setSampleId] = useState<SampleId>("solidwave");
  const [finishId, setFinishId] = useState("chrome");
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
        dpr={[1, 1.5]}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 1.4, 16], fov: 28, near: 0.1, far: 200 }}
        className="!absolute inset-0"
      >
        <CameraFit />
        <Stage />
        <Hero3D sampleId={sampleId} finishId={finishId} />
        <EffectComposer multisampling={4} frameBufferType={THREE.HalfFloatType}>
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      </Canvas>

      {/* Controls: shape on the left, finish on the right (stacked on small screens). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 max-tab:flex-col max-tab:items-center">
        <div role="group" aria-label="Forme" className="glass pointer-events-auto flex items-center gap-0.5 rounded-[16px] p-1">
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
                className={`focus-ring grid size-10 place-items-center rounded-[12px] transition-[background-color,color,box-shadow] duration-200 [--ring-offset:2px] ${
                  active ? "bg-surface text-ink shadow-raise" : "text-ink-3 hover:bg-well-strong hover:text-ink"
                }`}
              >
                <SampleIcon sample={sample} size={17} />
              </button>
            );
          })}
        </div>
        <div
          role="group"
          aria-label="Finition"
          className="glass no-scrollbar pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[16px] p-1"
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
                className={`focus-ring flex h-10 shrink-0 items-center gap-2 rounded-[12px] pl-1.5 transition-[background-color,padding,box-shadow] duration-300 ease-out [--ring-offset:2px] ${
                  active ? "bg-surface pr-3 shadow-raise" : "pr-1.5 hover:bg-well-strong"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="block size-7 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.08),0_2px_6px_-2px_rgba(0,0,0,.3)]"
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
