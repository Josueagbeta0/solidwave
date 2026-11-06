"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Aperture,
  Box,
  ChevronDown,
  Clapperboard,
  Download,
  Droplets,
  Gem,
  ImagePlus,
  Layers,
  Lightbulb,
  Loader2,
  Maximize2,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCw,
  Shapes,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { SampleIcon } from "@/components/SampleIcon";
import { IconCanvas } from "@/components/studio/IconCanvas";
import {
  ChoiceGrid,
  ColorField,
  PanelSection,
  Segmented,
  Slider,
  Switch,
  ToggleRow,
} from "@/components/studio/controls";
import {
  backgroundPresets,
  backgroundStyle,
  finishById,
  finishesFor,
  type Finish,
  type FinishGroup,
} from "@/lib/studio/materials";
import { lightRigs } from "@/lib/studio/lighting";
import { autoBackdrop, luminance, mixHex } from "@/lib/studio/backdrop";
import { looks, type Look } from "@/lib/studio/looks";
import {
  buildIcon,
  disposeIcon,
  type BuiltIcon,
  type EdgeProfile,
  type GeometryMode,
} from "@/lib/studio/geometry";
import type {
  ActionsRef,
  CameraView,
  FloorMode,
  MaterialSettings,
  MotionMode,
  RenderQuality,
  SceneSettings,
  ToneMap,
  VideoAspect,
} from "@/lib/studio/types";
import { sampleById, sampleSvg, samples } from "@/lib/samples";
import {
  defaultTraceOptions,
  loadHtmlImage,
  normalizeSvgMarkup,
  rasterizeSvg,
  svgToShapes,
  traceImageSource,
  type TraceOptions,
  type TraceResult,
} from "@/lib/trace";

type Tab = "look" | "shape" | "material" | "light" | "render";
type BgMode = "solid" | "linear" | "radial";
type Dims = { width: number; height: number; depth: number; edge: number };
type Source =
  | { kind: "raster"; image: HTMLImageElement; url: string }
  | { kind: "vector"; svg: string; url: string };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const DEFAULT_DIMS: Dims = { width: 100, height: 100, depth: 14, edge: 3.2 };

const modeCopy: Record<GeometryMode, string> = {
  extrude: "Un volume biseauté aux arêtes nettes et polies. Idéal pour les logos, icônes et textes.",
  stack: "Quatre plaques espacées, comme une enseigne en acrylique superposée.",
  inflate: "Un volume gonflé, comme un coussin. Les reflets glissent sur les bords comme du verre soufflé.",
  relief: "Une plaque peu épaisse qui garde votre visuel imprimé sur la face avant.",
};

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "look", label: "Ambiances", icon: <Sparkles size={18} strokeWidth={1.6} /> },
  { id: "shape", label: "Forme", icon: <Shapes size={18} strokeWidth={1.6} /> },
  { id: "material", label: "Matière", icon: <Palette size={18} strokeWidth={1.6} /> },
  { id: "light", label: "Lumière", icon: <Lightbulb size={18} strokeWidth={1.6} /> },
  { id: "render", label: "Rendu", icon: <Aperture size={18} strokeWidth={1.6} /> },
];

const dockFinishes = [
  "clear",
  "frosted",
  "holo",
  "prism",
  "sapphire",
  "chrome",
  "gold",
  "rose-gold",
  "titanium",
  "black-metal",
  "ceramic",
];

const qualityOptions: { value: RenderQuality; label: string; detail: string }[] = [
  { value: "draft", label: "Brouillon", detail: "Aperçu rapide" },
  { value: "high", label: "Haute", detail: "Effets, lissage" },
  { value: "ultra", label: "Ultra", detail: "Détail maximal" },
];

const pngSizes = [1024, 2048, 4096] as const;

const materialFrom = (finish: Finish): MaterialSettings => {
  const isGlass = finish.group === "glass" || finish.group === "liquid";
  return {
    finish,
    tint: finish.color,
    metalness: finish.metalness,
    roughness: finish.roughness,
    transmission: finish.transmission ?? 0,
    thickness: finish.thickness ?? 2,
    ior: finish.ior ?? 1.5,
    dispersion: finish.dispersion ?? 0,
    iridescence: finish.iridescence ?? 0,
    clearcoat: finish.clearcoat ?? (isGlass ? 0.4 : 0),
    attenuationColor: finish.attenuationColor ?? finish.color,
    attenuationDistance: finish.attenuationDistance ?? 100,
    reliefUrl: null,
  };
};

/** Paints the stage background into an export canvas (mirrors backgroundStyle()). */
function paintStage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: BgMode,
  center: string,
  edge: string,
  vignette: number,
  halo: number,
  haloColor: string,
) {
  const cx = width / 2;
  const span = Math.max(width, height);
  const small = Math.min(width, height);
  if (mode === "solid") {
    ctx.fillStyle = center;
  } else if (mode === "linear") {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, center);
    gradient.addColorStop(1, edge);
    ctx.fillStyle = gradient;
  } else {
    const gradient = ctx.createRadialGradient(cx, height * 0.12, 0, cx, height * 0.12, span * 1.05);
    gradient.addColorStop(0, center);
    gradient.addColorStop(1, edge);
    ctx.fillStyle = gradient;
  }
  ctx.fillRect(0, 0, width, height);

  if (halo > 0.01) {
    const glow = ctx.createRadialGradient(cx, height / 2, 0, cx, height / 2, small * 0.42);
    const alpha = Math.round(halo * 0.55 * 255)
      .toString(16)
      .padStart(2, "0");
    glow.addColorStop(0, `${haloColor}${alpha}`);
    glow.addColorStop(1, `${haloColor}00`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  if (vignette > 0.01) {
    const vig = ctx.createRadialGradient(cx, height * 0.45, small * 0.3, cx, height * 0.45, span * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, `rgba(0,0,0,${(vignette * 0.7).toFixed(3)})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  }
}

function Sphere({ finish, size = 40 }: { finish: Finish; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: finish.swatch,
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,.12), 0 6px 14px -6px rgba(0,0,0,.7)",
      }}
    />
  );
}

function NumberField({
  label,
  value,
  unit,
  onChange,
  min = 1,
  max = 500,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex h-10 min-w-0 flex-1 items-center gap-1 rounded-[10px] bg-well px-2.5 shadow-[inset_0_0_0_1px_var(--color-hairline)] focus-within:shadow-[inset_0_0_0_1px_#2f5bff]">
      <span className="font-mono text-[11px] text-ink-4">{label}</span>
      <input
        type="number"
        value={Number(value.toFixed(1))}
        min={min}
        max={max}
        step={0.5}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(clamp(next, min, max));
        }}
        className="min-w-0 flex-1 bg-transparent text-right font-mono text-[12.5px] tabular-nums text-ink outline-none"
      />
      <span className="text-[10.5px] text-ink-4">{unit}</span>
    </label>
  );
}

export function Studio() {
  /* ---------------------------------------------------------------- */
  /* State                                                             */
  /* ---------------------------------------------------------------- */
  const [tab, setTab] = useState<Tab>("look");
  const [mode, setMode] = useState<GeometryMode>("extrude");
  const [edgeProfile, setEdgeProfile] = useState<EdgeProfile>("round");
  const [lookId, setLookId] = useState<string | null>("studio-blanc");
  const [dims, setDims] = useState<Dims>(DEFAULT_DIMS);
  const [traceOptions, setTraceOptions] = useState<TraceOptions>({ ...defaultTraceOptions });
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [fileName, setFileName] = useState("Sans titre");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stats, setStats] = useState({ width: 100, height: 100, depth: 14, triangles: 0 });

  const [finishGroup, setFinishGroup] = useState<FinishGroup>("glass");
  const [material, setMaterial] = useState<MaterialSettings>(() => materialFrom(finishById("chrome")));

  const [backgroundId, setBackgroundId] = useState("white");
  const [backgroundMode, setBackgroundMode] = useState<BgMode>("radial");
  const [bgCenter, setBgCenter] = useState("#ffffff");
  const [bgEdge, setBgEdge] = useState("#e4e2de");
  const [vignette, setVignette] = useState(0.08);
  const [halo, setHalo] = useState(0);
  const [autoStage, setAutoStage] = useState(true);

  const [rig, setRig] = useState("studio");
  const [lightAngle, setLightAngle] = useState(0);
  const [studioLight, setStudioLight] = useState(1.4);
  const [exposure, setExposure] = useState(1);
  const [floor, setFloor] = useState<FloorMode>("soft");
  const [shadow, setShadow] = useState(0.6);

  const [quality, setQuality] = useState<RenderQuality>("high");
  const [toneMap, setToneMap] = useState<ToneMap>("neutral");
  const [bloom, setBloom] = useState(0.15);
  const [aberration, setAberration] = useState(0);
  const [grain, setGrain] = useState(0);
  const [lens, setLens] = useState(28);
  const [autoRotate, setAutoRotate] = useState(false);
  const [motion, setMotion] = useState<MotionMode>("sway");
  const [rotateSpeed, setRotateSpeed] = useState(1.2);
  const [view, setView] = useState<CameraView>("angle");
  const [fitTick, setFitTick] = useState(0);

  const [pngSize, setPngSize] = useState<(typeof pngSizes)[number]>(2048);
  const [pngBackground, setPngBackground] = useState(false);
  const [videoAspect, setVideoAspect] = useState<VideoAspect>("square");
  const [videoSeconds, setVideoSeconds] = useState(6);
  const [recordProgress, setRecordProgress] = useState<number | null>(null);

  const actionsRef: ActionsRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<Source | null>(null);
  const iconRef = useRef<BuiltIcon | null>(null);
  const initialised = useRef(false);
  const toastTimer = useRef<number | null>(null);

  const finish = material.finish;
  const background =
    backgroundPresets.find((preset) => preset.id === backgroundId) ?? backgroundPresets[0];
  const haloColor = material.tint.length === 7 ? material.tint : "#2f5bff";

  // Automatic backdrop: follows the finish colour. Manual picks switch it off.
  const target = useMemo(
    () => (autoStage ? autoBackdrop(material.tint, material.metalness) : { center: bgCenter, edge: bgEdge }),
    [autoStage, material.tint, material.metalness, bgCenter, bgEdge],
  );
  // The displayed stage glides to its target instead of snapping.
  const [stage, setStage] = useState(target);
  const stageRef = useRef(stage);
  useEffect(() => {
    const from = stageRef.current;
    if (from.center === target.center && from.edge === target.edge) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 1 : 450;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = { center: mixHex(from.center, target.center, eased), edge: mixHex(from.edge, target.edge, eased) };
      stageRef.current = next;
      setStage(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  const stageCenter = stage.center;
  const stageEdge = stage.edge;
  // Overlays switch between light and dark styling from the actual stage colour.
  const darkStage = luminance(stageCenter) < 0.45;

  const sceneSettings: SceneSettings = {
    view,
    autoRotate,
    motion,
    rotateSpeed,
    rig,
    lightAngle,
    studioLight,
    exposure,
    lens,
    floor,
    floorColor: stageEdge,
    shadow,
    quality,
    toneMap,
    bloom,
    aberration,
    grain,
  };

  // Relief mode prints the source artwork on the front face.
  const renderMaterial = useMemo(
    () => ({ ...material, reliefUrl: mode === "relief" ? fileUrl : null }),
    [material, mode, fileUrl],
  );

  const icon = useMemo(() => {
    if (!trace) return null;
    return buildIcon(trace, {
      mode,
      widthMm: dims.width,
      heightMm: dims.height,
      depthMm: dims.depth,
      edgeMm: dims.edge,
      quality,
      edgeProfile,
    });
  }, [trace, mode, dims.width, dims.height, dims.depth, dims.edge, quality, edgeProfile]);

  useEffect(() => {
    const previous = iconRef.current;
    iconRef.current = icon;
    return () => {
      if (previous && previous !== icon) disposeIcon(previous);
    };
  }, [icon]);

  /* ---------------------------------------------------------------- */
  /* Loading                                                           */
  /* ---------------------------------------------------------------- */
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      const source = sourceRef.current;
      if (source && source.url.startsWith("blob:")) URL.revokeObjectURL(source.url);
    };
  }, []);

  const applyFinish = useCallback((id: string) => {
    const next = finishById(id);
    setFinishGroup(next.group);
    setMaterial(materialFrom(next));
  }, []);

  const applyLook = useCallback(
    (look: Look) => {
      setLookId(look.id);
      applyFinish(look.finish);
      setRig(look.rig);
      setLightAngle(look.lightAngle);
      setStudioLight(look.studioLight);
      setExposure(look.exposure);
      setBackgroundId(look.backdrop.preset ?? `look-${look.id}`);
      setBackgroundMode(look.backdrop.mode);
      setBgCenter(look.backdrop.center);
      setBgEdge(look.backdrop.edge);
      // The white studio look keeps the colour-following backdrop; the others are art-directed.
      setAutoStage(look.id === "studio-blanc");
      setHalo(look.halo);
      setVignette(look.vignette);
      setFloor(look.floor);
      setShadow(look.shadow);
      setToneMap(look.toneMap);
      setBloom(look.bloom);
    },
    [applyFinish],
  );

  const updateDimsFromTrace = useCallback((result: TraceResult) => {
    const aspect = result.height / result.width;
    setDims((current) => ({ ...current, height: clamp(current.width * aspect, 1, 500) }));
  }, []);

  const applyResult = useCallback(
    (result: TraceResult, name: string, url: string, source: Source) => {
      const previous = sourceRef.current;
      if (previous && previous.url !== url && previous.url.startsWith("blob:")) {
        const stale = previous.url;
        window.setTimeout(() => URL.revokeObjectURL(stale), 1000);
      }
      sourceRef.current = source;
      setTrace(result);
      setFileName(name);
      setFileUrl(url);
      updateDimsFromTrace(result);
    },
    [updateDimsFromTrace],
  );

  const loadRaster = useCallback(
    (image: HTMLImageElement, url: string, name: string) => {
      const result = traceImageSource(image, traceOptions);
      applyResult(result, name, url, { kind: "raster", image, url });
    },
    [traceOptions, applyResult],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;
      const name = file.name || "Untitled";
      const isSvg = file.type === "image/svg+xml" || name.toLowerCase().endsWith(".svg");
      if (!isSvg && !file.type.startsWith("image/")) {
        notify("Utilisez une image SVG, PNG, JPG ou WebP.");
        return;
      }
      setBusy(true);
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      try {
        if (isSvg) {
          const text = await file.text();
          const vector = svgToShapes(text);
          if (vector) {
            const blob = new Blob([normalizeSvgMarkup(text)], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            applyResult(vector, name, url, { kind: "vector", svg: text, url });
            notify(`${vector.shapeCount} forme${vector.shapeCount === 1 ? "" : "s"} lue${vector.shapeCount === 1 ? "" : "s"} dans le fichier vectoriel`);
          } else {
            const image = await rasterizeSvg(text);
            loadRaster(image, image.src, name);
            notify("Vectoriel tracé comme une image");
          }
        } else {
          const url = URL.createObjectURL(file);
          const image = await loadHtmlImage(url);
          loadRaster(image, url, name);
          notify("Contour tracé");
        }
      } catch {
        notify("Impossible de tracer ce fichier. Essayez un PNG à la silhouette nette.");
      } finally {
        setBusy(false);
      }
    },
    [loadRaster, notify, applyResult],
  );

  const loadSample = useCallback(
    async (id: string, finishId?: string) => {
      const sample = sampleById(id);
      setBusy(true);
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      try {
        const svg = normalizeSvgMarkup(sampleSvg(sample));
        const vector = svgToShapes(svg);
        if (vector) {
          const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
          applyResult(vector, `${sample.id}.svg`, url, { kind: "vector", svg, url });
        } else {
          const image = await rasterizeSvg(svg);
          const result = traceImageSource(image, traceOptions);
          applyResult(result, `${sample.id}.svg`, image.src, {
            kind: "raster",
            image,
            url: image.src,
          });
        }
        // Keep the current finish (set by the active look) unless the URL asks for one.
        if (finishId) applyFinish(finishId);
        notify(`${sample.name} chargé`);
      } catch {
        notify("La forme n’a pas pu être chargée.");
      } finally {
        setBusy(false);
      }
    },
    [applyFinish, notify, traceOptions, applyResult],
  );

  // Re-trace raster sources when the outline settings change.
  useEffect(() => {
    const source = sourceRef.current;
    if (!source || source.kind !== "raster") return;
    const handle = window.setTimeout(() => {
      try {
        const result = traceImageSource(source.image, traceOptions);
        setTrace(result);
        updateDimsFromTrace(result);
      } catch {
        /* keep the previous trace */
      }
    }, 180);
    return () => window.clearTimeout(handle);
  }, [traceOptions, updateDimsFromTrace]);

  // Initialise from the query string (?sample=bolt&finish=gold).
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    const params = new URLSearchParams(window.location.search);
    const sample = params.get("sample");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time init from the URL on mount
    if (sample) loadSample(sample, params.get("finish") ?? undefined);
    const q = params.get("quality");
    if (q === "draft" || q === "high" || q === "ultra") setQuality(q);
    if (window.innerWidth < 900) setPanelOpen(false);
  }, [loadSample]);

  /* ---------------------------------------------------------------- */
  /* Shortcuts                                                         */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setPanelOpen((open) => !open);
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "f") {
        setView("angle");
        setFitTick((value) => value + 1);
      } else if (key === "r") {
        setAutoRotate((value) => !value);
      } else if (/^[1-5]$/.test(key)) {
        setTab(tabs[Number(key) - 1].id);
        setPanelOpen(true);
      } else if (key === "escape") {
        setExportOpen(false);
      }
    };

    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? [])[0];
      if (file) {
        event.preventDefault();
        handleFile(file);
      }
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [handleFile]);

  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-export-menu]")) setExportOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [exportOpen]);

  const onStats = useCallback(
    (next: { width: number; height: number; depth: number; triangles: number }) => setStats(next),
    [],
  );

  /* ---------------------------------------------------------------- */
  /* Export                                                            */
  /* ---------------------------------------------------------------- */
  const exportAs = async (kind: "png" | "glb" | "stl") => {
    if (!icon || !actionsRef.current) {
      notify("Ajoutez d’abord une image.");
      return;
    }
    setExportOpen(false);
    setExporting(true);
    // Let the overlay paint before the GPU gets busy.
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    try {
      if (kind === "png") {
        await actionsRef.current.exportPng({
          size: pngSize,
          paint: pngBackground
            ? (ctx, size) =>
                paintStage(ctx, size, size, backgroundMode, stageCenter, stageEdge, vignette, halo, haloColor)
            : undefined,
        });
        notify(`PNG généré en ${pngSize} × ${pngSize}`);
      } else {
        if (kind === "glb") await actionsRef.current.exportGlb();
        else await actionsRef.current.exportStl();
        notify(`${kind.toUpperCase()} exporté`);
      }
    } catch {
      notify(
        kind === "png" && pngSize === 4096
          ? "La 4K est trop lourde pour ce GPU. Essayez la 2K."
          : "L’export a échoué. Essayez une autre finition.",
      );
    } finally {
      setExporting(false);
    }
  };

  const exportVideo = async () => {
    if (!icon || !actionsRef.current) {
      notify("Ajoutez d’abord une image.");
      return;
    }
    setExportOpen(false);
    setExporting(true);
    setRecordProgress(0);
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    try {
      const extension = await actionsRef.current.exportVideo({
        aspect: videoAspect,
        seconds: videoSeconds,
        paint: (ctx, width, height) =>
          paintStage(ctx, width, height, backgroundMode, stageCenter, stageEdge, vignette, halo, haloColor),
        onProgress: (progress) => setRecordProgress(progress),
      });
      notify(`Vidéo enregistrée en ${extension.toUpperCase()}`);
    } catch (error) {
      notify(
        error instanceof Error && error.message.includes("browser")
          ? "Ce navigateur ne peut pas enregistrer de vidéo. Essayez Chrome ou Edge."
          : "L’enregistrement a échoué. Essayez la qualité Brouillon.",
      );
    } finally {
      setRecordProgress(null);
      setExporting(false);
    }
  };

  const resetDims = () =>
    setDims({
      ...DEFAULT_DIMS,
      height: clamp(100 * ((trace?.height ?? 1) / (trace?.width ?? 1)), 1, 500),
    });

  const swatches = finishesFor(finishGroup);
  const bgStyle = backgroundStyle(background, backgroundMode, stageCenter, stageEdge, vignette);
  const kbd = "rounded-[5px] bg-well-strong px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3";

  /* ---------------------------------------------------------------- */
  /* Panels                                                            */
  /* ---------------------------------------------------------------- */
  const lookPanel = (
    <PanelSection title="Choisissez un point de départ">
      <div className="grid grid-cols-2 gap-2">
        {looks.map((look) => {
          const active = lookId === look.id;
          return (
            <button
              key={look.id}
              type="button"
              aria-pressed={active}
              onClick={() => applyLook(look)}
              className={`focus-ring group flex flex-col rounded-[14px] p-1.5 text-left transition-[background-color,box-shadow] duration-200 [--ring-offset:1px] ${
                active
                  ? "bg-raised shadow-[0_0_0_1px_#2f5bffaa,0_10px_28px_-14px_#2f5bffcc]"
                  : "bg-well shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-well-strong"
              }`}
            >
              <span
                aria-hidden="true"
                className="relative grid h-[76px] place-items-center overflow-hidden rounded-[9px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]"
                style={{ background: look.preview }}
              >
                <span className="transition-transform duration-500 ease-spring group-hover:-translate-y-0.5 group-hover:scale-110">
                  <Sphere finish={finishById(look.finish)} size={34} />
                </span>
              </span>
              <span className="mt-2 px-1 text-[12.5px] font-semibold text-ink">{look.name}</span>
              <span className="mb-1 mt-0.5 px-1 text-[11px] leading-[1.35] text-ink-4 [text-wrap:pretty]">
                {look.blurb}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11.5px] leading-[1.45] text-ink-4 [text-wrap:pretty]">
        Une ambiance est un point de départ : chaque réglage reste modifiable dans les autres onglets.
      </p>
    </PanelSection>
  );

  const shapePanel = (
    <>
      <PanelSection title="Volume" onReset={() => setMode("extrude")}>
        <ChoiceGrid
          ariaLabel="Type de volume"
          columns={4}
          value={mode}
          onChange={setMode}
          options={(
            [
              ["extrude", "Extrudé"],
              ["stack", "Empilé"],
              ["inflate", "Gonflé"],
              ["relief", "Relief"],
            ] as [GeometryMode, string][]
          ).map(([value, label]) => ({
            value,
            label,
            preview: <ModeGlyph mode={value} />,
          }))}
        />
        <p className="mt-3 text-[12px] leading-[1.5] text-ink-3">{modeCopy[mode]}</p>
      </PanelSection>

      <PanelSection title="Dimensions" hint="La hauteur suit le contour" onReset={resetDims}>
        <div className="flex gap-1.5">
          <NumberField
            label="L"
            value={dims.width}
            unit="mm"
            onChange={(width) =>
              setDims((current) => ({
                ...current,
                width,
                height: clamp(width * ((trace?.height ?? 1) / (trace?.width ?? 1)), 1, 500),
              }))
            }
          />
          <NumberField
            label="H"
            value={dims.height}
            unit="mm"
            onChange={(height) =>
              setDims((current) => ({
                ...current,
                height,
                width: clamp(height * ((trace?.width ?? 1) / (trace?.height ?? 1)), 1, 500),
              }))
            }
          />
          <NumberField
            label="P"
            value={dims.depth}
            unit="mm"
            min={0.5}
            max={200}
            onChange={(depth) => setDims((current) => ({ ...current, depth }))}
          />
        </div>
        <div className="mt-3">
          <Slider
            label="Rayon des arêtes"
            value={dims.edge}
            min={0}
            max={8}
            step={0.1}
            unit=" mm"
            defaultValue={DEFAULT_DIMS.edge}
            onChange={(edge) => setDims((current) => ({ ...current, edge }))}
            description="Biseaute les arêtes avant et arrière. Limité à la moitié de la profondeur."
          />
          {mode !== "inflate" && (
            <>
              <p className="mb-2 mt-1 text-[12px] text-ink-3">Profil des arêtes</p>
              <Segmented
                ariaLabel="Profil des arêtes"
                value={edgeProfile}
                onChange={setEdgeProfile}
                options={[
                  { value: "round", label: "Arrondi" },
                  { value: "chamfer", label: "Chanfrein" },
                ]}
              />
            </>
          )}
        </div>
      </PanelSection>

      <PanelSection
        title="Contour"
        hint={
          trace
            ? `${trace.shapeCount} forme${trace.shapeCount === 1 ? "" : "s"} · ${trace.source === "vector" ? "vectoriel" : "image"}`
            : undefined
        }
      >
        {trace?.source === "vector" ? (
          <p className="rounded-[10px] bg-well px-3 py-2.5 text-[12px] leading-[1.5] text-ink-3 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
            Source vectorielle : les tracés sont utilisés tels quels. Les réglages de détection s’appliquent aux PNG, JPG et WebP.
          </p>
        ) : (
          <>
            <p className="mb-2 text-[12px] text-ink-3">Détecter la forme par</p>
            <Segmented
              ariaLabel="Mode de détection"
              value={traceOptions.mode}
              onChange={(next) => setTraceOptions((options) => ({ ...options, mode: next }))}
              options={[
                { value: "auto", label: "Auto" },
                { value: "dark", label: "Sombre" },
                { value: "light", label: "Clair" },
                { value: "alpha", label: "Alpha" },
                { value: "color", label: "Couleur" },
              ]}
            />
            <div className="mt-3">
              <Slider
                label="Seuil"
                value={traceOptions.cutoff}
                min={0}
                max={1}
                step={0.01}
                defaultValue={defaultTraceOptions.cutoff}
                onChange={(value) => setTraceOptions((options) => ({ ...options, cutoff: value }))}
              />
              <Slider
                label="Lissage"
                value={traceOptions.smoothing}
                min={0}
                max={3}
                step={0.1}
                unit=" px"
                defaultValue={defaultTraceOptions.smoothing}
                onChange={(value) =>
                  setTraceOptions((options) => ({ ...options, smoothing: value }))
                }
              />
            </div>
            <ToggleRow
              label="Boucher les trous"
              description="Ferme l’intérieur des lettres comme O et A."
              checked={traceOptions.fillHoles}
              onChange={(checked) =>
                setTraceOptions((options) => ({ ...options, fillHoles: checked }))
              }
            />
            <p className="mb-2 mt-1 text-[12px] text-ink-3">Résolution de détection</p>
            <Segmented
              ariaLabel="Résolution de détection"
              value={String(traceOptions.detail)}
              onChange={(next) =>
                setTraceOptions((options) => ({ ...options, detail: Number(next) }))
              }
              options={[512, 1024, 2048].map((value) => ({
                value: String(value),
                label: `${value}px`,
              }))}
            />
          </>
        )}
      </PanelSection>
    </>
  );

  const materialPanel = (
    <>
      <PanelSection title="Finition">
        <Segmented
          ariaLabel="Famille de finitions"
          value={finishGroup}
          onChange={(next) => {
            setFinishGroup(next);
            const first = finishesFor(next)[0];
            if (first) applyFinish(first.id);
          }}
          options={[
            { value: "glass", label: "Verre", icon: <Gem size={13} strokeWidth={1.6} /> },
            { value: "liquid", label: "Liquide", icon: <Droplets size={13} strokeWidth={1.6} /> },
            { value: "metal", label: "Métal", icon: <Layers size={13} strokeWidth={1.6} /> },
            { value: "color", label: "Couleur", icon: <Palette size={13} strokeWidth={1.6} /> },
          ]}
        />
        <div className="mt-3 grid grid-cols-4 gap-1">
          {swatches.map((item) => {
            const active = finish.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => applyFinish(item.id)}
                aria-pressed={active}
                className={`focus-ring flex min-h-[78px] flex-col items-center justify-center gap-1.5 rounded-[12px] px-1 py-2.5 transition-[background,box-shadow] duration-200 [--ring-offset:1px] ${
                  active
                    ? "bg-raised shadow-[0_0_0_1px_#2f5bff99,0_6px_20px_-10px_#2f5bffaa]"
                    : "hover:bg-well-strong"
                }`}
              >
                <Sphere finish={item} />
                <span className="text-center text-[11px] font-medium leading-[1.15] text-ink-2">
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </PanelSection>

      {(finishGroup === "glass" || finishGroup === "liquid") && (
        <PanelSection title="Optique">
          <Slider
            label="Réfraction"
            value={material.ior}
            min={1}
            max={2.5}
            step={0.01}
            defaultValue={finish.ior ?? 1.5}
            onChange={(value) => setMaterial((current) => ({ ...current, ior: value }))}
            description="1,5 verre à vitre · 1,9 cristal · 2,4 diamant."
          />
          <Slider
            label="Dispersion"
            value={material.dispersion}
            min={0}
            max={2}
            step={0.05}
            defaultValue={finish.dispersion ?? 0}
            onChange={(value) => setMaterial((current) => ({ ...current, dispersion: value }))}
            description="Décompose la lumière en arc-en-ciel sur les arêtes, comme un prisme."
          />
          <Slider
            label="Épaisseur optique"
            value={material.thickness}
            min={0.5}
            max={20}
            step={0.1}
            unit=" mm"
            defaultValue={finish.thickness ?? 2}
            onChange={(value) => setMaterial((current) => ({ ...current, thickness: value }))}
            description="À quel point l’objet déforme ce qui est derrière lui."
          />
          <Slider
            label="Transparence"
            value={material.transmission}
            min={0}
            max={1}
            step={0.01}
            defaultValue={finish.transmission ?? 0}
            onChange={(value) => setMaterial((current) => ({ ...current, transmission: value }))}
          />
          <Slider
            label="Dépoli"
            value={material.roughness}
            min={0}
            max={1}
            step={0.01}
            defaultValue={finish.roughness}
            onChange={(value) => setMaterial((current) => ({ ...current, roughness: value }))}
          />
        </PanelSection>
      )}

      <PanelSection title="Couleur">
        <ColorField
          label={finishGroup === "metal" || finishGroup === "color" ? "Couleur de base" : "Teinte"}
          value={material.tint}
          onChange={(value) =>
            setMaterial((current) => ({ ...current, tint: value, attenuationColor: value }))
          }
        />
        {(finishGroup === "glass" || finishGroup === "liquid") && (
          <Slider
            label="Profondeur de teinte"
            value={material.attenuationDistance}
            min={10}
            max={800}
            step={5}
            unit=" mm"
            defaultValue={finish.attenuationDistance ?? 100}
            onChange={(value) =>
              setMaterial((current) => ({ ...current, attenuationDistance: value }))
            }
            description="Plus la valeur est basse, plus la couleur est dense et profonde."
          />
        )}
      </PanelSection>

      <PanelSection title="Surface">
        {(finishGroup === "metal" || finishGroup === "color") && (
          <>
            <Slider
              label="Métallique"
              value={material.metalness}
              min={0}
              max={1}
              step={0.01}
              defaultValue={finish.metalness}
              onChange={(value) => setMaterial((current) => ({ ...current, metalness: value }))}
            />
            <Slider
              label="Rugosité"
              value={material.roughness}
              min={0}
              max={1}
              step={0.01}
              defaultValue={finish.roughness}
              onChange={(value) => setMaterial((current) => ({ ...current, roughness: value }))}
            />
          </>
        )}
        <Slider
          label="Vernis"
          value={material.clearcoat}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => setMaterial((current) => ({ ...current, clearcoat: value }))}
          description="Une couche de laque avec ses propres reflets nets."
        />
        <Slider
          label="Irisation"
          value={material.iridescence}
          min={0}
          max={1}
          step={0.01}
          defaultValue={finish.iridescence ?? 0}
          onChange={(value) => setMaterial((current) => ({ ...current, iridescence: value }))}
          description="Des couleurs de film fin qui changent avec l’angle."
        />
      </PanelSection>
    </>
  );

  const lightPanel = (
    <>
      <PanelSection title="Éclairage">
        <ChoiceGrid
          ariaLabel="Éclairage"
          columns={3}
          value={rig}
          onChange={setRig}
          options={lightRigs.map((item) => ({
            value: item.id,
            label: item.name,
            preview: (
              <span
                aria-hidden="true"
                className="block h-9 w-full rounded-[8px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)]"
                style={{ background: item.swatch }}
              />
            ),
          }))}
        />
        <div className="mt-3">
          <Slider
            label="Rotation des lumières"
            value={lightAngle}
            min={-180}
            max={180}
            step={1}
            unit="°"
            defaultValue={0}
            onChange={setLightAngle}
            description="Fait tourner les boîtes à lumière autour de l’objet ; les reflets suivent."
          />
          <Slider
            label="Puissance"
            value={studioLight}
            min={0}
            max={4}
            step={0.05}
            defaultValue={1.6}
            onChange={setStudioLight}
          />
          <Slider
            label="Exposition"
            value={exposure}
            min={0.2}
            max={2.5}
            step={0.01}
            defaultValue={1}
            onChange={setExposure}
          />
        </div>
      </PanelSection>

      <PanelSection title="Fond">
        <div className="mb-3 flex items-start justify-between gap-3 rounded-[12px] bg-accent-soft px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-ink">Fond automatique</p>
            <p className="mt-0.5 text-[11.5px] leading-[1.4] text-ink-3 [text-wrap:pretty]">
              S’accorde à la couleur de la finition : teinte pastel pour les couleurs, blanc studio
              pour le chrome, le verre clair et le noir.
            </p>
          </div>
          <Switch label="Fond automatique" checked={autoStage} onChange={setAutoStage} />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {backgroundPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-label={preset.name}
              title={preset.name}
              aria-pressed={!autoStage && backgroundId === preset.id}
              onClick={() => {
                setBackgroundId(preset.id);
                setAutoStage(false);
                setBgCenter(preset.center);
                setBgEdge(preset.edge);
              }}
              className={`focus-ring aspect-square rounded-[9px] shadow-[inset_0_0_0_1px_rgba(12,10,9,.1)] transition-[outline] [--ring-offset:2px] ${
                !autoStage && backgroundId === preset.id
                  ? "outline-2 outline-offset-2 outline-accent"
                  : "hover:outline-1 hover:outline-offset-2 hover:outline-ink/25"
              }`}
              style={{
                background: `radial-gradient(110% 90% at 50% 15%, ${preset.center}, ${preset.edge})`,
              }}
            />
          ))}
        </div>
        <div className="mt-3">
          <Segmented
            ariaLabel="Dégradé du fond"
            value={backgroundMode}
            onChange={setBackgroundMode}
            options={[
              { value: "solid", label: "Uni" },
              { value: "linear", label: "Linéaire" },
              { value: "radial", label: "Radial" },
            ]}
          />
        </div>
        <div className="mt-3">
          <ColorField
            label="Centre"
            value={stageCenter}
            onChange={(value) => {
              // Editing a colour takes over from the automatic backdrop, starting from what's on screen.
              if (autoStage) setBgEdge(stageEdge);
              setAutoStage(false);
              setBgCenter(value);
            }}
          />
          <ColorField
            label="Bords"
            value={stageEdge}
            onChange={(value) => {
              if (autoStage) setBgCenter(stageCenter);
              setAutoStage(false);
              setBgEdge(value);
            }}
          />
          <Slider
            label="Halo"
            value={halo}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0.35}
            onChange={setHalo}
            description="Une lueur douce derrière l’objet, teintée de sa couleur."
          />
          <Slider
            label="Vignette"
            value={vignette}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0.35}
            onChange={setVignette}
          />
        </div>
      </PanelSection>

      <PanelSection title="Sol">
        <Segmented
          ariaLabel="Sol"
          value={floor}
          onChange={setFloor}
          options={[
            { value: "none", label: "Aucun" },
            { value: "shadow", label: "Contact" },
            { value: "soft", label: "Douce" },
            { value: "reflect", label: "Miroir" },
          ]}
        />
        <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-4 [text-wrap:pretty]">
          {floor === "soft"
            ? "Ombre douce d’une grande boîte à lumière au-dessus. Suit la rotation des lumières."
            : floor === "reflect"
              ? "Miroir flou qui se fond dans le décor."
              : floor === "shadow"
                ? "Ombre de contact serrée, juste sous l’objet."
                : "L’objet flotte, sans sol."}
        </p>
        {floor !== "none" && (
          <div className="mt-3">
            <Slider
              label="Ombre"
              value={shadow}
              min={0}
              max={1}
              step={0.01}
              defaultValue={0.6}
              onChange={setShadow}
            />
          </div>
        )}
      </PanelSection>
    </>
  );

  const renderPanel = (
    <>
      <PanelSection title="Qualité">
        <ChoiceGrid
          ariaLabel="Qualité de rendu"
          columns={3}
          value={quality}
          onChange={setQuality}
          options={qualityOptions}
        />
        <p className="mt-3 text-[11.5px] leading-[1.45] text-ink-4">
          Ultra double la précision des courbes et des biseaux, avec une densité de pixels plus élevée. À
          utiliser pour les gros plans et les rendus finaux.
        </p>
      </PanelSection>

      <PanelSection title="Image">
        <p className="mb-2 text-[12px] text-ink-3">Rendu des tons</p>
        <Segmented
          ariaLabel="Rendu des tons"
          value={toneMap}
          onChange={setToneMap}
          options={[
            { value: "agx", label: "AgX" },
            { value: "neutral", label: "Neutral" },
            { value: "aces", label: "Ciné" },
          ]}
        />
        <div className="mt-3">
          <Slider
            label="Halo lumineux"
            value={bloom}
            min={0}
            max={1.5}
            step={0.01}
            defaultValue={0.35}
            onChange={setBloom}
            description={
              quality === "draft"
                ? "Passez en qualité Haute pour voir les effets."
                : "Les hautes lumières rayonnent doucement, comme à travers un objectif."
            }
          />
          <Slider
            label="Frange optique"
            value={aberration}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0}
            onChange={setAberration}
          />
          <Slider
            label="Grain argentique"
            value={grain}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0}
            onChange={setGrain}
          />
        </div>
      </PanelSection>

      <PanelSection title="Caméra">
        <Slider
          label="Champ de vision"
          value={lens}
          min={14}
          max={70}
          step={1}
          unit="°"
          defaultValue={28}
          onChange={setLens}
          description="Un angle étroit aplatit la perspective, comme un téléobjectif en photo produit."
        />
        <ToggleRow label="Rotation automatique" checked={autoRotate} onChange={setAutoRotate} />
        <Segmented
          ariaLabel="Mouvement"
          value={motion}
          onChange={setMotion}
          options={[
            { value: "sway", label: "Balancement" },
            { value: "turn", label: "Tour complet" },
          ]}
        />
        <div className="mt-3">
          <Slider
            label="Vitesse"
            value={rotateSpeed}
            min={0}
            max={3}
            step={0.05}
            defaultValue={1.2}
            onChange={setRotateSpeed}
          />
        </div>
      </PanelSection>
    </>
  );

  /* ---------------------------------------------------------------- */
  /* Layout                                                            */
  /* ---------------------------------------------------------------- */
  const activeTab = tabs.find((item) => item.id === tab) ?? tabs[0];
  // Overlays sit on the 3D stage: style them for whichever backdrop is behind.
  const overlay = darkStage
    ? "bg-black/45 text-white/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)] backdrop-blur-md"
    : "bg-white/85 text-ink-2 shadow-raise backdrop-blur-md";
  const overlayButton = darkStage
    ? "text-white/70 hover:bg-white/10 hover:text-white"
    : "text-ink-3 hover:bg-well-strong hover:text-ink";
  const overlayActive = darkStage ? "bg-white/15 text-white" : "bg-surface text-ink shadow-raise";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-shell text-ink">
      {/* Top bar */}
      <header className="relative z-40 flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-surface px-3 max-fold:px-2">
        <Link
          href="/"
          aria-label="Accueil SolidWave"
          className="focus-ring group flex items-center gap-2 rounded-[10px] pr-1 [--ring-offset:4px]"
        >
          <LogoMark size={26} gradient className="transition-transform duration-500 ease-spring group-hover:-rotate-6" />
          <span className="text-[15px] font-semibold tracking-[-0.04em] max-phone:hidden">SolidWave</span>
        </Link>
        <span className="h-5 w-px bg-hairline-strong max-fold:hidden" />

        {/* Current file */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="focus-ring flex min-w-0 items-center gap-2.5 rounded-[10px] py-1 pl-1 pr-2.5 transition-colors duration-150 hover:bg-well-strong max-fold:hidden [--ring-offset:2px]"
        >
          <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-night shadow-[inset_0_0_0_1px_var(--color-hairline)]">
            {fileUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl} alt="" className="size-full object-contain p-1" />
            ) : (
              <ImagePlus size={15} strokeWidth={1.6} className="text-ink-4" />
            )}
          </span>
          <span className="min-w-0 text-left">
            <span className="block max-w-[220px] truncate text-[13px] font-medium text-ink">
              {trace ? fileName : "Aucun fichier"}
            </span>
            <span className="block truncate font-mono text-[10.5px] text-ink-4">
              {trace
                ? `${stats.triangles.toLocaleString("fr-FR")} triangles`
                : "SVG · PNG · JPG · WebP"}
            </span>
          </span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="focus-ring flex h-9 items-center gap-2 rounded-[10px] px-3 text-[13px] font-medium text-ink-2 transition-colors duration-150 hover:bg-well-strong hover:text-ink press [--ring-offset:2px]"
          >
            <Upload size={15} strokeWidth={1.8} />
            <span className="max-phone:hidden">Importer</span>
          </button>

          <div className="relative" data-export-menu>
            <button
              type="button"
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((open) => !open)}
              disabled={!icon || exporting}
              className="focus-ring flex h-9 items-center gap-2 rounded-[10px] bg-primary pl-3.5 pr-2.5 text-[13px] font-medium text-primary-foreground press disabled:cursor-not-allowed disabled:opacity-40 [--press:.96] [--ring-offset:3px]"
            >
              {exporting ? (
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              ) : (
                <Download size={14} strokeWidth={2} />
              )}
              Exporter
              <ChevronDown
                size={13}
                strokeWidth={2}
                className={`transition-transform duration-200 ${exportOpen ? "rotate-180" : ""}`}
              />
            </button>

            {exportOpen && (
              <div className="thin-scrollbar animate-rise absolute right-0 top-[calc(100%+8px)] z-50 max-h-[calc(100dvh-80px)] w-[340px] overflow-y-auto rounded-[16px] bg-surface p-2 shadow-float [animation-duration:.25s] max-phone:fixed max-phone:inset-x-2 max-phone:top-16 max-phone:w-auto">
                {/* Image */}
                <div className="rounded-[12px] p-3">
                  <p className="flex items-center gap-2 text-[13px] font-semibold">
                    <ImagePlus size={15} strokeWidth={1.8} className="text-accent" />
                    Image PNG
                  </p>
                  <div className="mt-3">
                    <Segmented
                      ariaLabel="Taille du PNG"
                      value={String(pngSize)}
                      onChange={(next) => setPngSize(Number(next) as (typeof pngSizes)[number])}
                      options={pngSizes.map((value) => ({
                        value: String(value),
                        label: value === 4096 ? "4K" : `${value / 1024}K`,
                      }))}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-ink-2">Inclure le fond</span>
                    <Switch label="Inclure le fond" checked={pngBackground} onChange={setPngBackground} />
                  </div>
                  <button
                    type="button"
                    onClick={() => exportAs("png")}
                    className="focus-ring mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-accent text-[13px] font-medium text-white shadow-[0_6px_16px_-8px_#2f5bff] transition-colors hover:bg-accent-strong press [--ring-offset:2px]"
                  >
                    Générer le PNG · {pngSize} px
                  </button>
                  <p className="mt-2 text-[11px] leading-[1.4] text-ink-4">
                    {pngBackground
                      ? "Le fond, le halo et le sol miroir sont intégrés."
                      : "Fond transparent avec ombre douce."}
                  </p>
                </div>

                <div className="mx-3 h-px bg-hairline" />

                {/* Video */}
                <div className="rounded-[12px] p-3">
                  <p className="flex items-center gap-2 text-[13px] font-semibold">
                    <Clapperboard size={15} strokeWidth={1.8} className="text-accent" />
                    Vidéo 360°
                  </p>
                  <div className="mt-3">
                    <Segmented
                      ariaLabel="Format vidéo"
                      value={videoAspect}
                      onChange={setVideoAspect}
                      options={[
                        { value: "square", label: "1:1" },
                        { value: "portrait", label: "9:16" },
                        { value: "landscape", label: "16:9" },
                      ]}
                    />
                  </div>
                  <div className="mt-2">
                    <Segmented
                      ariaLabel="Durée de la boucle"
                      value={String(videoSeconds)}
                      onChange={(next) => setVideoSeconds(Number(next))}
                      options={[4, 6, 10].map((value) => ({ value: String(value), label: `${value} s` }))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={exportVideo}
                    className="focus-ring mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-[13px] font-medium text-primary-foreground press [--ring-offset:2px]"
                  >
                    Enregistrer la boucle
                  </button>
                  <p className="mt-2 text-[11px] leading-[1.4] text-ink-4 [text-wrap:pretty]">
                    Un tour complet en 60 images/s, qui boucle sans coupure, avec le fond. MP4.
                  </p>
                </div>

                <div className="mx-3 h-px bg-hairline" />

                {/* 3D */}
                <div className="p-3">
                  <p className="flex items-center gap-2 text-[13px] font-semibold">
                    <Box size={15} strokeWidth={1.8} className="text-accent" />
                    Fichiers 3D
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { kind: "glb" as const, title: "GLB", detail: "Web · three.js · AR" },
                      { kind: "stl" as const, title: "STL", detail: "Impression 3D · mm" },
                    ].map((item) => (
                      <button
                        key={item.kind}
                        type="button"
                        onClick={() => exportAs(item.kind)}
                        className="focus-ring rounded-[10px] bg-surface px-3 py-2.5 text-left shadow-raise transition-shadow duration-150 hover:shadow-float [--ring-offset:1px]"
                      >
                        <span className="block text-[13px] font-semibold text-ink">.{item.title.toLowerCase()}</span>
                        <span className="block truncate text-[11px] text-ink-4">{item.detail}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Viewport */}
        <main
          className="relative min-w-0 flex-1 overflow-hidden"
          style={{ background: bgStyle }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-500"
            style={{
              opacity: trace ? halo : 0,
              background: `radial-gradient(38% 34% at 50% 50%, ${haloColor}8c, transparent 72%)`,
              filter: "blur(30px)",
            }}
          />

          <IconCanvas
            icon={icon}
            material={renderMaterial}
            settings={sceneSettings}
            actionsRef={actionsRef}
            sizeName={fileName}
            fitTick={fitTick}
            onStats={onStats}
            stageKey={`${backgroundMode}-${stageCenter}-${stageEdge}-${vignette}-${halo}-${haloColor}`}
            paintStage={(ctx, width, height) =>
              paintStage(ctx, width, height, backgroundMode, stageCenter, stageEdge, vignette, halo, haloColor)
            }
          />

          {/* View switcher */}
          {trace && (
            <div className={`absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-[12px] p-1 max-tab:top-2 ${overlay}`}>
              {(
                [
                  ["angle", "3/4"],
                  ["front", "Face"],
                  ["side", "Profil"],
                  ["top", "Dessus"],
                ] as [CameraView, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => {
                    setView(value);
                    setFitTick((tick) => tick + 1);
                  }}
                  className={`focus-ring rounded-[9px] px-3 py-1.5 text-[12.5px] font-medium transition-[background-color,color,box-shadow] duration-150 [--ring-offset:1px] ${
                    view === value ? overlayActive : overlayButton
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Dimensions readout */}
          {trace && (
            <div className={`pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-3 rounded-[10px] px-3 py-2 font-mono text-[11px] max-tab:hidden ${overlay}`}>
              {(
                [
                  ["L", stats.width],
                  ["H", stats.height],
                  ["P", stats.depth],
                ] as [string, number][]
              ).map(([label, value]) => (
                <span key={label} className="tabular-nums">
                  <span className="opacity-50">{label} </span>
                  {value.toFixed(1).replace(".", ",")}
                  <span className="opacity-50"> mm</span>
                </span>
              ))}
            </div>
          )}

          {/* Quick actions */}
          {trace && (
            <div className={`absolute right-4 top-4 z-10 flex flex-col gap-0.5 rounded-[12px] p-1 max-tab:right-2 max-tab:top-14 ${overlay}`}>
              <button
                type="button"
                aria-label="Recadrer"
                title="Recadrer (F)"
                onClick={() => {
                  setView("angle");
                  setFitTick((value) => value + 1);
                }}
                className={`focus-ring grid size-9 place-items-center rounded-[9px] transition-colors duration-150 [--ring-offset:1px] ${overlayButton}`}
              >
                <Maximize2 size={15} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label="Rotation automatique"
                aria-pressed={autoRotate}
                title="Rotation automatique (R)"
                onClick={() => setAutoRotate((value) => !value)}
                className={`focus-ring grid size-9 place-items-center rounded-[9px] transition-colors duration-150 [--ring-offset:1px] ${
                  autoRotate ? overlayActive : overlayButton
                }`}
              >
                <RotateCw size={15} strokeWidth={1.8} className={autoRotate ? "animate-[spin_4s_linear_infinite]" : ""} />
              </button>
              <button
                type="button"
                aria-label="Changer la qualité"
                title={`Qualité : ${qualityOptions.find((option) => option.value === quality)?.label}`}
                onClick={() =>
                  setQuality((current) => (current === "draft" ? "high" : current === "high" ? "ultra" : "draft"))
                }
                className={`focus-ring grid size-9 place-items-center rounded-[9px] font-mono text-[10px] font-semibold transition-colors duration-150 [--ring-offset:1px] ${overlayButton}`}
              >
                {quality === "draft" ? "SD" : quality === "high" ? "HD" : "4K"}
              </button>
            </div>
          )}

          {/* Finish dock */}
          {trace && (
            <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-3 max-tab:bottom-3">
              <div className={`no-scrollbar flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[16px] p-1.5 ${overlay}`}>
                {dockFinishes.map((id, index) => {
                  const item = finishById(id);
                  const active = finish.id === id;
                  return (
                    <div key={id} className="contents">
                      {index === 5 && (
                        <span className={`mx-1 h-5 w-px shrink-0 ${darkStage ? "bg-white/15" : "bg-hairline-strong"}`} />
                      )}
                      <button
                        type="button"
                        aria-label={item.name}
                        title={item.name}
                        aria-pressed={active}
                        onClick={() => applyFinish(id)}
                        className={`focus-ring grid size-9 shrink-0 place-items-center rounded-[11px] transition-[background-color,box-shadow,scale] duration-200 hover:scale-110 [--ring-offset:1px] ${
                          active ? "shadow-[0_0_0_1.5px_var(--color-accent)]" : ""
                        }`}
                      >
                        <Sphere finish={item} size={24} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!trace && !busy && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`focus-ring group flex w-full max-w-[520px] flex-col items-center rounded-[28px] border border-dashed px-8 py-11 transition-colors duration-300 [--ring-offset:4px] max-phone:px-5 max-phone:py-8 ${
                  darkStage
                    ? "border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]"
                    : "border-black/15 bg-white/60 hover:border-black/25 hover:bg-white/80"
                }`}
              >
                <span className="mb-6 grid size-16 place-items-center rounded-[20px] bg-white shadow-float transition-transform duration-500 ease-spring group-hover:-translate-y-1 group-hover:rotate-3">
                  <LogoMark size={34} gradient />
                </span>
                <span
                  className={`text-[clamp(26px,3vw,36px)] font-semibold leading-[1.05] tracking-[-0.045em] ${
                    darkStage ? "text-white" : "text-ink"
                  }`}
                >
                  Déposez un logo pour le rendre <span className="serif-accent">solide</span>
                </span>
                <span
                  className={`mt-3 max-w-[42ch] text-[14px] leading-[1.6] [text-wrap:pretty] ${
                    darkStage ? "text-white/55" : "text-ink-3"
                  }`}
                >
                  SVG, PNG, JPG ou WebP. Vous pouvez aussi coller une image. Rien n’est envoyé : tout
                  se passe sur votre machine.
                </span>
                <span
                  className={`mt-7 inline-flex h-11 items-center gap-2 rounded-[12px] px-5 text-[14px] font-medium ${
                    darkStage ? "bg-white text-ink" : "bg-primary text-primary-foreground"
                  }`}
                >
                  <Upload size={16} strokeWidth={2} />
                  Choisir un fichier
                </span>
              </button>

              <p className={`eyebrow mt-9 ${darkStage ? "!text-white/45" : ""}`}>Ou partir d’une forme</p>
              <div className="mt-3 flex max-w-[520px] flex-wrap items-center justify-center gap-1.5">
                {samples.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    aria-label={`Ouvrir la forme ${sample.name}`}
                    title={sample.name}
                    onClick={() => loadSample(sample.id)}
                    className={`focus-ring grid size-11 place-items-center rounded-[12px] press [--press:.92] [--ring-offset:2px] ${
                      darkStage
                        ? "bg-white/[0.06] text-white/75 shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)] hover:bg-white/15 hover:text-white"
                        : "bg-white text-ink-2 shadow-raise hover:text-ink hover:shadow-float"
                    }`}
                  >
                    <SampleIcon sample={sample} size={19} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => loadSample("solidwave")}
                className={`focus-ring mt-5 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors [--ring-offset:2px] ${
                  darkStage ? "text-white/55 hover:text-white" : "text-ink-3 hover:text-ink"
                }`}
              >
                <Wand2 size={13} strokeWidth={1.8} />
                Essayer avec le logo SolidWave
              </button>
            </div>
          )}

          {(busy || exporting) && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-black/20 backdrop-blur-[2px]">
              <div className="flex w-[240px] flex-col items-center rounded-[20px] bg-surface p-6 shadow-float">
                <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
                  {exporting ? (
                    <Sparkles size={20} strokeWidth={1.6} className="animate-pulse" />
                  ) : (
                    <Box size={20} strokeWidth={1.6} className="animate-pulse" />
                  )}
                </span>
                <p className="mt-3 text-[14px] font-medium text-ink">
                  {recordProgress !== null
                    ? "Enregistrement de la vidéo"
                    : exporting
                      ? "Rendu en cours"
                      : "Construction du volume"}
                </p>
                <p className="mt-1 max-w-full truncate text-[12px] tabular-nums text-ink-3">
                  {recordProgress !== null ? `${Math.round(recordProgress * 100)} %` : fileName}
                </p>
                <span className="mt-4 h-1 w-full overflow-hidden rounded-full bg-well-strong">
                  {recordProgress !== null ? (
                    <span
                      className="block h-full rounded-full bg-accent transition-[width] duration-150"
                      style={{ width: `${recordProgress * 100}%` }}
                    />
                  ) : (
                    <span className="wave-flow block h-full w-full rounded-full" />
                  )}
                </span>
              </div>
            </div>
          )}

          {!panelOpen && (
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="focus-ring glass absolute bottom-20 right-4 z-20 hidden h-10 items-center gap-2 rounded-[12px] px-4 text-[13px] font-medium text-ink press [--ring-offset:2px] max-tab:flex"
            >
              <PanelLeftOpen size={15} strokeWidth={1.7} />
              Modifier
            </button>
          )}
        </main>

        {/* Inspector */}
        {panelOpen && (
          <aside className="flex w-[340px] shrink-0 flex-col border-l border-hairline bg-surface max-desk:w-[310px] max-tab:absolute max-tab:inset-x-0 max-tab:bottom-0 max-tab:z-30 max-tab:h-[62dvh] max-tab:w-auto max-tab:rounded-t-[22px] max-tab:border-l-0 max-tab:shadow-float">
            <div className="hidden gap-1 p-2 max-tab:flex">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={tab === item.id}
                  onClick={() => setTab(item.id)}
                  className={`focus-ring flex h-9 flex-1 items-center justify-center rounded-[10px] text-[12px] font-medium [--ring-offset:1px] ${
                    tab === item.id ? "bg-well-strong text-ink" : "text-ink-3"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-hairline px-5 max-tab:hidden">
              <h2 className="text-[15px] font-semibold tracking-[-0.02em]">{activeTab.label}</h2>
              <span className="font-mono text-[10.5px] text-ink-4">{tabs.indexOf(activeTab) + 1} / 5</span>
            </div>

            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
              {tab === "look" && lookPanel}
              {tab === "shape" && shapePanel}
              {tab === "material" && materialPanel}
              {tab === "light" && lightPanel}
              {tab === "render" && renderPanel}
            </div>

            <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-t border-hairline px-5 text-[11px] text-ink-4 max-tab:hidden">
              <span className="flex items-center gap-1.5">
                <span className={kbd}>F</span> cadrer
                <span className={kbd}>R</span> rotation
                <span className={kbd}>1–5</span> onglets
              </span>
              <span className="flex items-center gap-1.5">
                <span className={kbd}>Ctrl V</span> coller
              </span>
            </div>
          </aside>
        )}

        {/* Tool rail */}
        <nav
          aria-label="Outils du studio"
          className="flex w-[68px] shrink-0 flex-col items-center gap-1 border-l border-hairline bg-surface py-3 max-tab:hidden"
        >
          {tabs.map((item, index) => {
            const active = panelOpen && tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                title={`${item.label} (${index + 1})`}
                onClick={() => {
                  if (active) setPanelOpen(false);
                  else {
                    setTab(item.id);
                    setPanelOpen(true);
                  }
                }}
                className={`focus-ring relative flex w-[56px] flex-col items-center gap-1 rounded-[12px] py-2 text-[10.5px] font-medium transition-colors duration-150 [--ring-offset:1px] ${
                  active ? "bg-accent-soft text-accent" : "text-ink-3 hover:bg-well-strong hover:text-ink"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-label={panelOpen ? "Masquer le panneau" : "Afficher le panneau"}
            title="Afficher / masquer le panneau (Ctrl B)"
            className="focus-ring mt-auto grid size-10 place-items-center rounded-[12px] text-ink-4 transition-colors hover:bg-well-strong hover:text-ink [--ring-offset:1px]"
          >
            {panelOpen ? <PanelLeftOpen size={17} strokeWidth={1.6} className="rotate-180" /> : <PanelLeftClose size={17} strokeWidth={1.6} className="rotate-180" />}
          </button>
        </nav>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/svg+xml,image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = "";
          }}
        />
      </div>

      {toast && (
        <div
          role="status"
          className="animate-rise fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-[12px] bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground shadow-float [animation-duration:.3s]"
        >
          {toast}
        </div>
      )}

      {panelOpen && (
        <button
          type="button"
          aria-label="Fermer le panneau"
          onClick={() => setPanelOpen(false)}
          className="fixed inset-0 z-20 hidden bg-black/30 max-tab:block"
        />
      )}
    </div>
  );
}

/** Tiny diagrams for the four geometry modes. */
function ModeGlyph({ mode }: { mode: GeometryMode }) {
  const common = "h-9 w-full rounded-[8px] bg-black/25 text-ink-2";
  return (
    <svg viewBox="0 0 48 28" className={common} aria-hidden="true">
      <defs>
        <linearGradient id={`g-${mode}`} x1="0" x2="1">
          <stop offset="0" stopColor="#2f5bff" />
          <stop offset="1" stopColor="#6a8bff" />
        </linearGradient>
      </defs>
      {mode === "extrude" && (
        <>
          <path d="M14 9h16l4 4v8H18l-4-4Z" fill="currentColor" opacity=".25" />
          <path d="M14 9h16v8H14Z" fill={`url(#g-${mode})`} />
        </>
      )}
      {mode === "stack" && (
        <>
          <rect x="16" y="15" width="16" height="3" rx="1" fill="currentColor" opacity=".25" />
          <rect x="15" y="11" width="16" height="3" rx="1" fill="currentColor" opacity=".45" />
          <rect x="14" y="7" width="16" height="3" rx="1" fill={`url(#g-${mode})`} />
        </>
      )}
      {mode === "inflate" && (
        <ellipse cx="24" cy="14" rx="10" ry="7" fill={`url(#g-${mode})`} />
      )}
      {mode === "relief" && (
        <>
          <rect x="12" y="8" width="24" height="13" rx="2.5" fill="currentColor" opacity=".3" />
          <path d="M18 17l4-5 3 3 2-2 3 4Z" fill={`url(#g-${mode})`} />
        </>
      )}
    </svg>
  );
}
