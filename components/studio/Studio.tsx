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
  extrude: "A bevelled solid with crisp, polished edges. Best for logos, icons and type.",
  stack: "Four plates with air between them, like a layered acrylic sign.",
  inflate: "A puffy, pillow-like solid. Highlights roll around the rim like blown glass.",
  relief: "A shallow tile that keeps your artwork printed on the front face.",
};

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "look", label: "Looks", icon: <Sparkles size={18} strokeWidth={1.6} /> },
  { id: "shape", label: "Shape", icon: <Shapes size={18} strokeWidth={1.6} /> },
  { id: "material", label: "Material", icon: <Palette size={18} strokeWidth={1.6} /> },
  { id: "light", label: "Light", icon: <Lightbulb size={18} strokeWidth={1.6} /> },
  { id: "render", label: "Render", icon: <Aperture size={18} strokeWidth={1.6} /> },
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
  { value: "draft", label: "Draft", detail: "Fast preview" },
  { value: "high", label: "High", detail: "Post FX, MSAA" },
  { value: "ultra", label: "Ultra", detail: "Max detail" },
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
    <label className="flex h-10 min-w-0 flex-1 items-center gap-1 rounded-[10px] bg-well px-2.5 shadow-[inset_0_0_0_1px_var(--color-hairline)] focus-within:shadow-[inset_0_0_0_1px_#5b7cff]">
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
  const [lookId, setLookId] = useState<string | null>("midnight-glass");
  const [dims, setDims] = useState<Dims>(DEFAULT_DIMS);
  const [traceOptions, setTraceOptions] = useState<TraceOptions>({ ...defaultTraceOptions });
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [fileName, setFileName] = useState("Untitled");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stats, setStats] = useState({ width: 100, height: 100, depth: 14, triangles: 0 });

  const [finishGroup, setFinishGroup] = useState<FinishGroup>("glass");
  const [material, setMaterial] = useState<MaterialSettings>(() => materialFrom(finishById("clear")));

  const [backgroundId, setBackgroundId] = useState("midnight");
  const [backgroundMode, setBackgroundMode] = useState<BgMode>("radial");
  const [bgCenter, setBgCenter] = useState("#1a2038");
  const [bgEdge, setBgEdge] = useState("#05060b");
  const [vignette, setVignette] = useState(0.35);
  const [halo, setHalo] = useState(0.35);

  const [rig, setRig] = useState("studio");
  const [lightAngle, setLightAngle] = useState(0);
  const [studioLight, setStudioLight] = useState(1.6);
  const [exposure, setExposure] = useState(1);
  const [floor, setFloor] = useState<FloorMode>("reflect");
  const [shadow, setShadow] = useState(0.6);

  const [quality, setQuality] = useState<RenderQuality>("high");
  const [toneMap, setToneMap] = useState<ToneMap>("neutral");
  const [bloom, setBloom] = useState(0.35);
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
  const darkStage = background.dark ?? false;
  const haloColor = material.tint.length === 7 ? material.tint : "#5b7cff";

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
    floorColor: bgEdge,
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
        notify("Use an SVG, PNG, JPG or WebP image.");
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
            notify(`${vector.shapeCount} shape${vector.shapeCount === 1 ? "" : "s"} read from the vector`);
          } else {
            const image = await rasterizeSvg(text);
            loadRaster(image, image.src, name);
            notify("Vector traced as an image");
          }
        } else {
          const url = URL.createObjectURL(file);
          const image = await loadHtmlImage(url);
          loadRaster(image, url, name);
          notify("Outline traced");
        }
      } catch {
        notify("That file could not be traced. Try a PNG with a clear silhouette.");
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
        applyFinish(finishId ?? sample.finish);
        notify(`${sample.name} loaded`);
      } catch {
        notify("The sample could not be loaded.");
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
      notify("Add an image first.");
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
                paintStage(ctx, size, size, backgroundMode, bgCenter, bgEdge, vignette, halo, haloColor)
            : undefined,
        });
        notify(`PNG rendered at ${pngSize} × ${pngSize}`);
      } else {
        if (kind === "glb") await actionsRef.current.exportGlb();
        else await actionsRef.current.exportStl();
        notify(`${kind.toUpperCase()} exported`);
      }
    } catch {
      notify(
        kind === "png" && pngSize === 4096
          ? "4K is too heavy for this GPU. Try 2K."
          : "The export failed. Try another finish.",
      );
    } finally {
      setExporting(false);
    }
  };

  const exportVideo = async () => {
    if (!icon || !actionsRef.current) {
      notify("Add an image first.");
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
          paintStage(ctx, width, height, backgroundMode, bgCenter, bgEdge, vignette, halo, haloColor),
        onProgress: (progress) => setRecordProgress(progress),
      });
      notify(`Turntable saved as ${extension.toUpperCase()}`);
    } catch (error) {
      notify(
        error instanceof Error && error.message.includes("browser")
          ? "This browser can't record video. Try Chrome or Edge."
          : "The recording failed. Try the Draft quality.",
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
  const bgStyle = backgroundStyle(background, backgroundMode, bgCenter, bgEdge, vignette);
  const kbd = "rounded-[5px] bg-well-strong px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3";

  /* ---------------------------------------------------------------- */
  /* Panels                                                            */
  /* ---------------------------------------------------------------- */
  const lookPanel = (
    <PanelSection title="Looks" hint="Finish, light, backdrop & post in one click">
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
                  ? "bg-raised shadow-[0_0_0_1px_#5b7cffaa,0_10px_28px_-14px_#5b7cffcc]"
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
        A look is a starting point: every setting stays editable in the other tabs.
      </p>
    </PanelSection>
  );

  const shapePanel = (
    <>
      <PanelSection title="Form" onReset={() => setMode("extrude")}>
        <ChoiceGrid
          ariaLabel="Geometry mode"
          columns={4}
          value={mode}
          onChange={setMode}
          options={(
            [
              ["extrude", "Extrude"],
              ["stack", "Stack"],
              ["inflate", "Inflate"],
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

      <PanelSection title="Size" hint="Height follows the outline" onReset={resetDims}>
        <div className="flex gap-1.5">
          <NumberField
            label="W"
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
            label="D"
            value={dims.depth}
            unit="mm"
            min={0.5}
            max={200}
            onChange={(depth) => setDims((current) => ({ ...current, depth }))}
          />
        </div>
        <div className="mt-3">
          <Slider
            label="Edge radius"
            value={dims.edge}
            min={0}
            max={8}
            step={0.1}
            unit=" mm"
            defaultValue={DEFAULT_DIMS.edge}
            onChange={(edge) => setDims((current) => ({ ...current, edge }))}
            description="Bevels front and back edges. Capped at half the depth."
          />
          {mode !== "inflate" && (
            <>
              <p className="mb-2 mt-1 text-[12px] text-ink-3">Edge profile</p>
              <Segmented
                ariaLabel="Edge profile"
                value={edgeProfile}
                onChange={setEdgeProfile}
                options={[
                  { value: "round", label: "Rounded" },
                  { value: "chamfer", label: "Chamfer" },
                ]}
              />
            </>
          )}
        </div>
      </PanelSection>

      <PanelSection
        title="Outline"
        hint={
          trace
            ? `${trace.shapeCount} shape${trace.shapeCount === 1 ? "" : "s"} · ${trace.source}`
            : undefined
        }
      >
        {trace?.source === "vector" ? (
          <p className="rounded-[10px] bg-well px-3 py-2.5 text-[12px] leading-[1.5] text-ink-3 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
            Vector source: the paths are used as-is. Tracing settings apply to PNG, JPG and WebP.
          </p>
        ) : (
          <>
            <p className="mb-2 text-[12px] text-ink-3">Detect the shape by</p>
            <Segmented
              ariaLabel="Trace mode"
              value={traceOptions.mode}
              onChange={(next) => setTraceOptions((options) => ({ ...options, mode: next }))}
              options={[
                { value: "auto", label: "Auto" },
                { value: "dark", label: "Dark" },
                { value: "light", label: "Light" },
                { value: "alpha", label: "Alpha" },
                { value: "color", label: "Color" },
              ]}
            />
            <div className="mt-3">
              <Slider
                label="Threshold"
                value={traceOptions.cutoff}
                min={0}
                max={1}
                step={0.01}
                defaultValue={defaultTraceOptions.cutoff}
                onChange={(value) => setTraceOptions((options) => ({ ...options, cutoff: value }))}
              />
              <Slider
                label="Smoothing"
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
              label="Fill holes"
              description="Close counters in letters like O and A."
              checked={traceOptions.fillHoles}
              onChange={(checked) =>
                setTraceOptions((options) => ({ ...options, fillHoles: checked }))
              }
            />
            <p className="mb-2 mt-1 text-[12px] text-ink-3">Trace resolution</p>
            <Segmented
              ariaLabel="Trace detail"
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
      <PanelSection title="Finish">
        <Segmented
          ariaLabel="Finish family"
          value={finishGroup}
          onChange={(next) => {
            setFinishGroup(next);
            const first = finishesFor(next)[0];
            if (first) applyFinish(first.id);
          }}
          options={[
            { value: "glass", label: "Glass", icon: <Gem size={13} strokeWidth={1.6} /> },
            { value: "liquid", label: "Liquid", icon: <Droplets size={13} strokeWidth={1.6} /> },
            { value: "metal", label: "Metal", icon: <Layers size={13} strokeWidth={1.6} /> },
            { value: "color", label: "Color", icon: <Palette size={13} strokeWidth={1.6} /> },
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
                    ? "bg-raised shadow-[0_0_0_1px_#5b7cff99,0_6px_20px_-10px_#5b7cffaa]"
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
        <PanelSection title="Optics">
          <Slider
            label="Refraction"
            value={material.ior}
            min={1}
            max={2.5}
            step={0.01}
            defaultValue={finish.ior ?? 1.5}
            onChange={(value) => setMaterial((current) => ({ ...current, ior: value }))}
            description="1.5 window glass · 1.9 crystal · 2.4 diamond."
          />
          <Slider
            label="Dispersion"
            value={material.dispersion}
            min={0}
            max={2}
            step={0.05}
            defaultValue={finish.dispersion ?? 0}
            onChange={(value) => setMaterial((current) => ({ ...current, dispersion: value }))}
            description="Splits edges into a rainbow, like a prism."
          />
          <Slider
            label="Thickness"
            value={material.thickness}
            min={0.5}
            max={20}
            step={0.1}
            unit=" mm"
            defaultValue={finish.thickness ?? 2}
            onChange={(value) => setMaterial((current) => ({ ...current, thickness: value }))}
            description="How much the object bends what is behind it."
          />
          <Slider
            label="Clarity"
            value={material.transmission}
            min={0}
            max={1}
            step={0.01}
            defaultValue={finish.transmission ?? 0}
            onChange={(value) => setMaterial((current) => ({ ...current, transmission: value }))}
          />
          <Slider
            label="Frost"
            value={material.roughness}
            min={0}
            max={1}
            step={0.01}
            defaultValue={finish.roughness}
            onChange={(value) => setMaterial((current) => ({ ...current, roughness: value }))}
          />
        </PanelSection>
      )}

      <PanelSection title="Colour">
        <ColorField
          label={finishGroup === "metal" || finishGroup === "color" ? "Base colour" : "Tint"}
          value={material.tint}
          onChange={(value) =>
            setMaterial((current) => ({ ...current, tint: value, attenuationColor: value }))
          }
        />
        {(finishGroup === "glass" || finishGroup === "liquid") && (
          <Slider
            label="Tint depth"
            value={material.attenuationDistance}
            min={10}
            max={800}
            step={5}
            unit=" mm"
            defaultValue={finish.attenuationDistance ?? 100}
            onChange={(value) =>
              setMaterial((current) => ({ ...current, attenuationDistance: value }))
            }
            description="Lower values give a deeper, richer colour."
          />
        )}
      </PanelSection>

      <PanelSection title="Surface">
        {(finishGroup === "metal" || finishGroup === "color") && (
          <>
            <Slider
              label="Metalness"
              value={material.metalness}
              min={0}
              max={1}
              step={0.01}
              defaultValue={finish.metalness}
              onChange={(value) => setMaterial((current) => ({ ...current, metalness: value }))}
            />
            <Slider
              label="Roughness"
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
          label="Clear coat"
          value={material.clearcoat}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => setMaterial((current) => ({ ...current, clearcoat: value }))}
          description="A lacquer layer with its own sharp reflections."
        />
        <Slider
          label="Iridescence"
          value={material.iridescence}
          min={0}
          max={1}
          step={0.01}
          defaultValue={finish.iridescence ?? 0}
          onChange={(value) => setMaterial((current) => ({ ...current, iridescence: value }))}
          description="Thin-film colours that shift with the angle."
        />
      </PanelSection>
    </>
  );

  const lightPanel = (
    <>
      <PanelSection title="Lighting rig">
        <ChoiceGrid
          ariaLabel="Lighting rig"
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
            label="Rotate lights"
            value={lightAngle}
            min={-180}
            max={180}
            step={1}
            unit="°"
            defaultValue={0}
            onChange={setLightAngle}
            description="Walks the softboxes around the object; reflections move with them."
          />
          <Slider
            label="Light power"
            value={studioLight}
            min={0}
            max={4}
            step={0.05}
            defaultValue={1.6}
            onChange={setStudioLight}
          />
          <Slider
            label="Exposure"
            value={exposure}
            min={0.2}
            max={2.5}
            step={0.01}
            defaultValue={1}
            onChange={setExposure}
          />
        </div>
      </PanelSection>

      <PanelSection title="Backdrop">
        <div className="grid grid-cols-7 gap-1.5">
          {backgroundPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-label={preset.name}
              title={preset.name}
              aria-pressed={backgroundId === preset.id}
              onClick={() => {
                setBackgroundId(preset.id);
                setBgCenter(preset.center);
                setBgEdge(preset.edge);
              }}
              className={`focus-ring aspect-square rounded-[9px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)] transition-[outline] [--ring-offset:2px] ${
                backgroundId === preset.id
                  ? "outline-2 outline-offset-2 outline-wave-cyan"
                  : "hover:outline-1 hover:outline-offset-2 hover:outline-white/25"
              }`}
              style={{
                background: `radial-gradient(110% 90% at 50% 15%, ${preset.center}, ${preset.edge})`,
              }}
            />
          ))}
        </div>
        <div className="mt-3">
          <Segmented
            ariaLabel="Backdrop gradient"
            value={backgroundMode}
            onChange={setBackgroundMode}
            options={[
              { value: "solid", label: "Solid" },
              { value: "linear", label: "Linear" },
              { value: "radial", label: "Radial" },
            ]}
          />
        </div>
        <div className="mt-3">
          <ColorField label="Centre" value={bgCenter} onChange={setBgCenter} />
          <ColorField label="Edge" value={bgEdge} onChange={setBgEdge} />
          <Slider
            label="Halo"
            value={halo}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0.35}
            onChange={setHalo}
            description="A soft glow behind the object, tinted with its colour."
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

      <PanelSection title="Floor">
        <Segmented
          ariaLabel="Floor"
          value={floor}
          onChange={setFloor}
          options={[
            { value: "none", label: "Float" },
            { value: "shadow", label: "Contact" },
            { value: "soft", label: "Soft" },
            { value: "reflect", label: "Mirror" },
          ]}
        />
        <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-4 [text-wrap:pretty]">
          {floor === "soft"
            ? "Area shadow from a large overhead softbox. Follows the light rotation."
            : floor === "reflect"
              ? "Blurred mirror that fades into the backdrop."
              : floor === "shadow"
                ? "Tight contact shadow right under the object."
                : "The object floats with no ground."}
        </p>
        {floor !== "none" && (
          <div className="mt-3">
            <Slider
              label="Shadow"
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
      <PanelSection title="Quality">
        <ChoiceGrid
          ariaLabel="Render quality"
          columns={3}
          value={quality}
          onChange={setQuality}
          options={qualityOptions}
        />
        <p className="mt-3 text-[11.5px] leading-[1.45] text-ink-4">
          Ultra doubles bevel rings and curve samples, and renders at a higher pixel density. Use
          it for close-ups and final shots.
        </p>
      </PanelSection>

      <PanelSection title="Look">
        <p className="mb-2 text-[12px] text-ink-3">Tone mapping</p>
        <Segmented
          ariaLabel="Tone mapping"
          value={toneMap}
          onChange={setToneMap}
          options={[
            { value: "agx", label: "AgX" },
            { value: "neutral", label: "Neutral" },
            { value: "aces", label: "Filmic" },
          ]}
        />
        <div className="mt-3">
          <Slider
            label="Bloom"
            value={bloom}
            min={0}
            max={1.5}
            step={0.01}
            defaultValue={0.35}
            onChange={setBloom}
            description={
              quality === "draft"
                ? "Switch quality to High to see post effects."
                : "Highlights glow softly, like a camera lens."
            }
          />
          <Slider
            label="Lens fringe"
            value={aberration}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0}
            onChange={setAberration}
          />
          <Slider
            label="Film grain"
            value={grain}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0}
            onChange={setGrain}
          />
        </div>
      </PanelSection>

      <PanelSection title="Camera">
        <Slider
          label="Field of view"
          value={lens}
          min={14}
          max={70}
          step={1}
          unit="°"
          defaultValue={28}
          onChange={setLens}
          description="Narrow angles flatten perspective, like a telephoto product shot."
        />
        <ToggleRow label="Turntable" checked={autoRotate} onChange={setAutoRotate} />
        <Segmented
          ariaLabel="Motion"
          value={motion}
          onChange={setMotion}
          options={[
            { value: "sway", label: "Sway" },
            { value: "turn", label: "Full turn" },
          ]}
        />
        <div className="mt-3">
          <Slider
            label="Speed"
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
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-shell text-ink">
      {/* Top bar */}
      <header className="relative z-40 flex h-14 shrink-0 items-center gap-2 border-b border-hairline px-3 max-fold:px-2">
        <Link
          href="/"
          aria-label="SolidWave home"
          className="focus-ring group flex items-center gap-2 rounded-lg pr-2 [--ring-offset:4px]"
        >
          <span className="grid size-8 place-items-center rounded-[9px] bg-night shadow-raise transition-transform duration-500 ease-spring group-hover:-rotate-6">
            <LogoMark size={22} gradient />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-[-0.04em] max-phone:hidden">
            SolidWave
          </span>
          <span className="rounded-full bg-well-strong px-1.5 py-0.5 font-mono text-[10px] text-ink-3 max-phone:hidden">
            STUDIO
          </span>
        </Link>

        <span className="mx-1 h-5 w-px bg-hairline max-fold:hidden" />
        <div className="flex min-w-0 items-center gap-2 max-fold:hidden">
          <span
            className={`size-1.5 shrink-0 rounded-full ${trace ? "bg-wave-cyan shadow-[0_0_8px_#39e1ff]" : "bg-ink-4"}`}
          />
          <span className="truncate text-[13px] text-ink-2">{trace ? fileName : "No file"}</span>
        </div>

        {/* View switcher */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full bg-well p-[3px] shadow-[inset_0_0_0_1px_var(--color-hairline)] max-tab:hidden">
          {(
            [
              ["angle", "Angle"],
              ["front", "Front"],
              ["side", "Side"],
              ["top", "Top"],
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
              className={`focus-ring rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors [--ring-offset:1px] ${
                view === value ? "bg-raised text-ink shadow-raise" : "text-ink-3 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="focus-ring flex h-9 items-center gap-2 rounded-full bg-well px-3.5 text-[13px] font-medium text-ink-2 shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-colors hover:bg-well-strong hover:text-ink press [--ring-offset:2px] max-phone:px-2.5"
          >
            <Upload size={14} strokeWidth={1.8} />
            <span className="max-phone:hidden">Import</span>
          </button>

          <div className="relative" data-export-menu>
            <button
              type="button"
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((open) => !open)}
              disabled={!icon || exporting}
              className="focus-ring relative flex h-9 items-center gap-2 overflow-hidden rounded-full bg-primary pl-3.5 pr-2.5 text-[13px] font-semibold text-primary-foreground press disabled:cursor-not-allowed disabled:opacity-40 [--press:.96] [--ring-offset:3px]"
            >
              {exporting ? (
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              ) : (
                <Download size={14} strokeWidth={2} />
              )}
              Export
              <ChevronDown
                size={13}
                strokeWidth={2}
                className={`transition-transform duration-200 ${exportOpen ? "rotate-180" : ""}`}
              />
            </button>

            {exportOpen && (
              <div className="panel thin-scrollbar absolute right-0 top-[calc(100%+8px)] z-50 max-h-[calc(100dvh-80px)] w-[320px] overflow-y-auto rounded-2xl p-3 max-phone:fixed max-phone:inset-x-2 max-phone:top-16 max-phone:w-auto">
                <p className="eyebrow mb-2 !text-[10.5px]">Image</p>
                <div className="rounded-xl bg-well p-2.5 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
                  <Segmented
                    ariaLabel="PNG size"
                    value={String(pngSize)}
                    onChange={(next) => setPngSize(Number(next) as (typeof pngSizes)[number])}
                    options={pngSizes.map((value) => ({
                      value: String(value),
                      label: value === 4096 ? "4K" : `${value / 1024}K`,
                    }))}
                  />
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-ink-2">Include backdrop</span>
                    <Switch label="Include backdrop" checked={pngBackground} onChange={setPngBackground} />
                  </div>
                  <button
                    type="button"
                    onClick={() => exportAs("png")}
                    className="focus-ring mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-wave text-[13px] font-semibold text-white shadow-glow press [--ring-offset:2px]"
                  >
                    <ImagePlus size={15} strokeWidth={1.9} />
                    Render PNG · {pngSize} px
                  </button>
                  <p className="mt-2 text-[11px] leading-[1.4] text-ink-4">
                    {pngBackground
                      ? "Backdrop, halo and mirror floor are baked in."
                      : "Transparent background with soft shadow."}
                  </p>
                </div>

                <p className="eyebrow mb-2 mt-3 !text-[10.5px]">Turntable video</p>
                <div className="rounded-xl bg-well p-2.5 shadow-[inset_0_0_0_1px_var(--color-hairline)]">
                  <Segmented
                    ariaLabel="Video format"
                    value={videoAspect}
                    onChange={setVideoAspect}
                    options={[
                      { value: "square", label: "1:1" },
                      { value: "portrait", label: "9:16" },
                      { value: "landscape", label: "16:9" },
                    ]}
                  />
                  <div className="mt-2">
                    <Segmented
                      ariaLabel="Loop length"
                      value={String(videoSeconds)}
                      onChange={(next) => setVideoSeconds(Number(next))}
                      options={[4, 6, 10].map((value) => ({ value: String(value), label: `${value} s` }))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={exportVideo}
                    className="focus-ring mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-raised text-[13px] font-semibold text-ink shadow-raise transition-colors hover:bg-well-strong press [--ring-offset:2px]"
                  >
                    <Clapperboard size={15} strokeWidth={1.9} />
                    Record a 360° loop
                  </button>
                  <p className="mt-2 text-[11px] leading-[1.4] text-ink-4 [text-wrap:pretty]">
                    One full turn that loops seamlessly, with the backdrop. MP4 where the browser
                    supports it, WebM otherwise.
                  </p>
                </div>

                <p className="eyebrow mb-2 mt-3 !text-[10.5px]">3D files</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { kind: "glb" as const, title: "GLB", detail: "three.js · web · AR", icon: <Box size={15} strokeWidth={1.7} /> },
                    { kind: "stl" as const, title: "STL", detail: "3D print · in mm", icon: <Layers size={15} strokeWidth={1.7} /> },
                  ].map((item) => (
                    <button
                      key={item.kind}
                      type="button"
                      onClick={() => exportAs(item.kind)}
                      className="focus-ring flex items-center gap-2.5 rounded-xl bg-well px-2.5 py-2.5 text-left shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-colors hover:bg-well-strong [--ring-offset:1px]"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-raised text-ink-2">
                        {item.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-ink">{item.title}</span>
                        <span className="block truncate text-[10.5px] text-ink-4">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Tool rail */}
        <nav
          aria-label="Studio tools"
          className="flex w-[64px] shrink-0 flex-col items-center gap-1 border-r border-hairline py-3 max-tab:hidden"
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
                className={`focus-ring group relative flex w-[52px] flex-col items-center gap-1 rounded-xl py-2 text-[10.5px] font-medium transition-colors [--ring-offset:1px] ${
                  active ? "bg-raised text-ink shadow-raise" : "text-ink-3 hover:bg-well hover:text-ink"
                }`}
              >
                {active && (
                  <span className="bg-wave absolute -left-[7px] top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full" />
                )}
                {item.icon}
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-label={panelOpen ? "Hide panel" : "Show panel"}
            title="Toggle panel (Ctrl/⌘ B)"
            className="focus-ring mt-auto grid size-10 place-items-center rounded-xl text-ink-4 transition-colors hover:bg-well hover:text-ink [--ring-offset:1px]"
          >
            {panelOpen ? <PanelLeftClose size={17} strokeWidth={1.6} /> : <PanelLeftOpen size={17} strokeWidth={1.6} />}
          </button>
        </nav>

        {/* Inspector */}
        {panelOpen && (
          <aside className="flex w-[340px] shrink-0 flex-col border-r border-hairline bg-night max-desk:w-[310px] max-tab:absolute max-tab:inset-x-0 max-tab:bottom-0 max-tab:z-30 max-tab:h-[60dvh] max-tab:w-auto max-tab:rounded-t-[22px] max-tab:border-r-0 max-tab:border-t max-tab:shadow-float">
            <div className="hidden gap-1 p-2 max-tab:flex">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={tab === item.id}
                  onClick={() => setTab(item.id)}
                  className={`focus-ring flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-medium [--ring-offset:1px] ${
                    tab === item.id ? "bg-raised text-ink shadow-raise" : "text-ink-3"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 border-b border-hairline p-3 max-tab:hidden">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Choose an image"
                className="focus-ring grid size-12 shrink-0 place-items-center overflow-hidden rounded-[12px] bg-well shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-colors hover:bg-well-strong [--ring-offset:2px]"
              >
                {fileUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl} alt="" className="size-full object-contain p-1.5" />
                ) : (
                  <ImagePlus size={20} strokeWidth={1.5} className="text-ink-3" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-ink">
                  {trace ? fileName : "Choose an image"}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-ink-4">
                  {trace
                    ? `${trace.points.toLocaleString()} pts · ${stats.triangles.toLocaleString()} tris`
                    : "SVG · PNG · JPG · WebP"}
                </p>
              </div>
            </div>

            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
              {tab === "look" && lookPanel}
              {tab === "shape" && shapePanel}
              {tab === "material" && materialPanel}
              {tab === "light" && lightPanel}
              {tab === "render" && renderPanel}
            </div>

            <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-t border-hairline px-3 text-[11px] text-ink-4 max-tab:hidden">
              <span className="flex items-center gap-1.5">
                <span className={kbd}>F</span> fit
                <span className={kbd}>R</span> spin
                <span className={kbd}>1–5</span> tabs
              </span>
              <span className="flex items-center gap-1.5">
                <span className={kbd}>⌘V</span> paste
              </span>
            </div>
          </aside>
        )}

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
            stageKey={`${backgroundMode}-${bgCenter}-${bgEdge}-${vignette}-${halo}-${haloColor}`}
            paintStage={(ctx, width, height) =>
              paintStage(ctx, width, height, backgroundMode, bgCenter, bgEdge, vignette, halo, haloColor)
            }
          />

          {/* Dimensions readout */}
          {trace && (
            <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-3 rounded-full bg-black/35 px-3 py-1.5 font-mono text-[11px] text-white/80 backdrop-blur-md max-tab:left-2 max-tab:top-2">
              {(
                [
                  ["W", stats.width],
                  ["H", stats.height],
                  ["D", stats.depth],
                ] as [string, number][]
              ).map(([label, value]) => (
                <span key={label} className="tabular-nums">
                  <span className="text-white/45">{label} </span>
                  {value.toFixed(1)}
                  <span className="text-white/45">mm</span>
                </span>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="absolute right-4 top-4 z-10 flex flex-col gap-1 rounded-2xl bg-black/35 p-1 backdrop-blur-md max-tab:right-2 max-tab:top-2">
            <button
              type="button"
              aria-label="Fit to view"
              title="Fit (F)"
              onClick={() => {
                setView("angle");
                setFitTick((value) => value + 1);
              }}
              className="focus-ring grid size-9 place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white [--ring-offset:1px]"
            >
              <Maximize2 size={15} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label="Turntable"
              aria-pressed={autoRotate}
              title="Turntable (R)"
              onClick={() => setAutoRotate((value) => !value)}
              className={`focus-ring grid size-9 place-items-center rounded-xl transition-colors [--ring-offset:1px] ${
                autoRotate ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <RotateCw
                size={15}
                strokeWidth={1.8}
                className={autoRotate ? "animate-[spin_4s_linear_infinite]" : ""}
              />
            </button>
            <button
              type="button"
              aria-label="Toggle quality"
              title={`Quality: ${quality}`}
              onClick={() =>
                setQuality((current) => (current === "draft" ? "high" : current === "high" ? "ultra" : "draft"))
              }
              className="focus-ring grid size-9 place-items-center rounded-xl font-mono text-[10px] font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white [--ring-offset:1px]"
            >
              {quality === "draft" ? "SD" : quality === "high" ? "HD" : "4K"}
            </button>
          </div>

          {/* Finish dock */}
          {trace && (
            <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-3 max-tab:bottom-3">
              <div className="no-scrollbar flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-black/40 p-1.5 backdrop-blur-md">
                {dockFinishes.map((id, index) => {
                  const item = finishById(id);
                  const active = finish.id === id;
                  return (
                    <div key={id} className="contents">
                      {index === 5 && <span className="mx-1 h-5 w-px shrink-0 bg-white/15" />}
                      <button
                        type="button"
                        aria-label={item.name}
                        title={item.name}
                        aria-pressed={active}
                        onClick={() => applyFinish(id)}
                        className={`focus-ring grid size-9 shrink-0 place-items-center rounded-full transition-[background,scale] duration-200 hover:scale-110 [--ring-offset:1px] ${
                          active ? "bg-white/15 ring-1 ring-wave-cyan/80" : "hover:bg-white/10"
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
                className={`focus-ring group ring-wave flex w-full max-w-[520px] flex-col items-center rounded-[28px] border border-dashed px-8 py-10 transition-colors [--ring-offset:4px] max-phone:px-5 max-phone:py-8 ${
                  darkStage
                    ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    : "border-black/10 bg-white/40 hover:bg-white/60"
                }`}
              >
                <span className="mb-5 grid size-16 place-items-center rounded-[20px] bg-night shadow-glow transition-transform duration-500 ease-spring group-hover:-translate-y-1 group-hover:rotate-3">
                  <LogoMark size={36} gradient />
                </span>
                <span
                  className={`font-display text-[clamp(24px,3vw,34px)] font-semibold leading-[1.05] tracking-[-0.04em] ${
                    darkStage ? "text-ink" : "text-[#0a0c14]"
                  }`}
                >
                  Drop a logo to make it solid
                </span>
                <span
                  className={`mt-3 max-w-[40ch] text-[14px] leading-[1.6] ${
                    darkStage ? "text-ink-3" : "text-[#4a5163]"
                  }`}
                >
                  SVG, PNG, JPG or WebP. Paste from the clipboard works too. Nothing is uploaded:
                  it all happens on your machine.
                </span>
                <span className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground">
                  <Upload size={16} strokeWidth={2} />
                  Choose a file
                </span>
              </button>

              <p className="eyebrow mt-8">Or start from a shape</p>
              <div className="mt-3 flex max-w-[520px] flex-wrap items-center justify-center gap-1.5">
                {samples.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    aria-label={`Open the ${sample.name} shape`}
                    title={sample.name}
                    onClick={() => loadSample(sample.id)}
                    className="focus-ring grid size-11 place-items-center rounded-2xl bg-white/[0.04] text-ink-2 shadow-[inset_0_0_0_1px_var(--color-hairline)] press hover:bg-white/10 hover:text-ink [--press:.92] [--ring-offset:2px]"
                  >
                    <SampleIcon sample={sample} size={19} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => loadSample("solidwave")}
                className="focus-ring mt-5 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-3 transition-colors hover:text-ink [--ring-offset:2px]"
              >
                <Wand2 size={13} strokeWidth={1.8} />
                Surprise me with the SolidWave mark
              </button>
            </div>
          )}

          {(busy || exporting) && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-black/30 backdrop-blur-[2px]">
              <div className="panel flex w-[230px] flex-col items-center rounded-[20px] p-6">
                <span className="grid size-12 place-items-center rounded-full bg-well-strong text-ink-2">
                  {exporting ? (
                    <Sparkles size={20} strokeWidth={1.5} className="animate-pulse" />
                  ) : (
                    <Box size={20} strokeWidth={1.5} className="animate-pulse" />
                  )}
                </span>
                <p className="mt-3 text-[14px] font-medium text-ink">
                  {recordProgress !== null ? "Recording turntable" : exporting ? "Rendering" : "Building the solid"}
                </p>
                <p className="mt-1 max-w-full truncate text-[12px] tabular-nums text-ink-3">
                  {recordProgress !== null ? `${Math.round(recordProgress * 100)} %` : fileName}
                </p>
                <span className="mt-4 h-1 w-full overflow-hidden rounded-full bg-well-strong">
                  {recordProgress !== null ? (
                    <span
                      className="bg-wave block h-full rounded-full transition-[width] duration-150"
                      style={{ width: `${recordProgress * 100}%` }}
                    />
                  ) : (
                    <span className="wave-flow block h-full w-full rounded-full opacity-90" />
                  )}
                </span>
              </div>
            </div>
          )}

          {!panelOpen && (
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="focus-ring glass absolute bottom-4 left-4 z-20 hidden h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-ink press [--ring-offset:2px] max-tab:flex"
            >
              <PanelLeftOpen size={15} strokeWidth={1.7} />
              Edit
            </button>
          )}
        </main>

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
          className="panel fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-full px-4 py-2.5 text-[13px] font-medium text-ink"
        >
          {toast}
        </div>
      )}

      {panelOpen && (
        <button
          type="button"
          aria-label="Close panel"
          onClick={() => setPanelOpen(false)}
          className="fixed inset-0 z-20 hidden bg-black/40 max-tab:block"
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
          <stop offset="0" stopColor="#39e1ff" />
          <stop offset="1" stopColor="#9b5cff" />
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
