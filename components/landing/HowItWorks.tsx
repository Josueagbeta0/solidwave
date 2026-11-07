"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FileUp, Layers3, MousePointer2, Palette, ScanLine, Share2 } from "lucide-react";
import { LOGO_PATHS } from "@/components/LogoMark";
import { Reveal } from "@/components/motion";

/** How long each step plays before the next one (ms). */
const STEP_MS = 5200;

const steps = [
  {
    id: "import",
    icon: FileUp,
    title: "Déposez un logo ou une photo",
    body: "Un logo en SVG, PNG, JPG ou WebP, ou la photo d’un objet : un vêtement, une voiture, un animal. Glissez-la, collez-la ou choisissez-la.",
  },
  {
    id: "trace",
    icon: ScanLine,
    title: "Le sujet est détouré",
    body: "Les logos sont vectorisés en contours nets, trous et détails fins compris. Sur une photo, l’objet est détouré automatiquement.",
  },
  {
    id: "extrude",
    icon: Layers3,
    title: "Il prend du volume",
    body: "Logo extrudé, gonflé ou en relief, en vrais millimètres. Photo : relief rapide sur votre appareil, ou objet complet à 360° généré par IA.",
  },
  {
    id: "dress",
    icon: Palette,
    title: "Matière et lumière",
    body: "Verre, chrome, or, couleur, ou les couleurs mêmes de votre logo, sous un éclairage de studio photo.",
  },
  {
    id: "export",
    icon: Share2,
    title: "Exportez partout",
    body: "PNG jusqu’en 4K, vidéo 360° qui boucle, GLB pour le web et la réalité augmentée, STL pour l’impression 3D.",
  },
] as const;

type StepId = (typeof steps)[number]["id"];

/* ------------------------------------------------------------------ */
/* Shared SVG pieces                                                   */
/* ------------------------------------------------------------------ */

/** The logo centred in the 400 × 300 stage (logo viewBox is 100 × 100 from y = 6). */
const LOGO_TRANSFORM = "translate(130 66) scale(1.4) translate(0 -6)";

function Logo({ fill, className, style }: { fill: string; className?: string; style?: CSSProperties }) {
  return (
    <g transform={LOGO_TRANSFORM} className={className} style={style}>
      {LOGO_PATHS.map((d) => (
        <path key={d} d={d} fill={fill} />
      ))}
    </g>
  );
}

const anim = (name: string, ms: number, delay = 0, extra = "both", easing = "cubic-bezier(0.23,1,0.32,1)") =>
  ({ animation: `${name} ${ms}ms ${easing} ${delay}ms ${extra}` }) as CSSProperties;

function Defs() {
  return (
    <defs>
      <linearGradient id="how-chrome" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.45" stopColor="#c9ced8" />
        <stop offset="0.55" stopColor="#8d94a3" />
        <stop offset="1" stopColor="#eef0f4" />
      </linearGradient>
      <linearGradient id="how-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff1c2" />
        <stop offset="0.5" stopColor="#e2a93b" />
        <stop offset="1" stopColor="#8a5a12" />
      </linearGradient>
      <linearGradient id="how-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="1" stopColor="#bcd0ff" stopOpacity="0.55" />
      </linearGradient>
      <linearGradient id="how-holo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7cf3ff" />
        <stop offset="0.5" stopColor="#b18cff" />
        <stop offset="1" stopColor="#ff8ad8" />
      </linearGradient>
      <linearGradient id="how-sweep" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <clipPath id="how-logo-clip">
        <g transform={LOGO_TRANSFORM}>
          {LOGO_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </clipPath>
      <radialGradient id="how-shadow">
        <stop offset="0" stopColor="#0c0a09" stopOpacity="0.22" />
        <stop offset="1" stopColor="#0c0a09" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** The extruded stack: back layers in steel greys, the front face on top. */
function Extrusion({ animate, front }: { animate: boolean; front: ReactNode }) {
  const layers = 16;
  return (
    <g>
      <ellipse cx="208" cy="236" rx="96" ry="12" fill="url(#how-shadow)" style={animate ? anim("how-fade", 900, 500) : undefined} />
      {Array.from({ length: layers }, (_, index) => {
        const i = layers - index; // draw deepest first
        const shade = 0.55 + (index / layers) * 0.3;
        return (
          <g
            key={i}
            style={
              {
                "--i": i,
                transform: animate ? undefined : `translate(${i * 1.35}px, ${i * 1.1}px)`,
                ...(animate ? anim("how-extrude", 1100, 250, "both", "cubic-bezier(0.3,1.12,0.4,1)") : {}),
              } as CSSProperties
            }
          >
            <Logo fill={`rgb(${Math.round(70 * shade)}, ${Math.round(82 * shade)}, ${Math.round(140 * shade + 40)})`} />
          </g>
        );
      })}
      {front}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step visuals                                                        */
/* ------------------------------------------------------------------ */

function ImportVisual() {
  return (
    <g>
      {/* Drop zone */}
      <rect
        x="110"
        y="52"
        width="180"
        height="180"
        rx="26"
        fill="#ffffff"
        stroke="#0c0a0926"
        strokeWidth="1.5"
        strokeDasharray="6 6"
        style={anim("how-fade", 400)}
      />
      <rect x="110" y="52" width="180" height="180" rx="26" fill="none" stroke="#2f5bff" strokeWidth="2" style={anim("how-fade", 300, 1250)} />
      {/* Flat logo revealed once the card lands */}
      <g className="svg-box" style={anim("how-grow", 650, 1250, "both", "cubic-bezier(0.3,1.12,0.4,1)")}>
        <Logo fill="#2f5bff" />
      </g>
      {/* File card */}
      <g className="svg-box" style={anim("how-drop", 1100, 150)}>
        <g className="svg-box" style={anim("how-absorb", 300, 1250)}>
          <path d="M168 92h50l18 18v72a8 8 0 0 1-8 8h-60a8 8 0 0 1-8-8V100a8 8 0 0 1 8-8Z" fill="#fff" stroke="#0c0a0933" strokeWidth="1.5" />
          <path d="M218 92v14a4 4 0 0 0 4 4h14" fill="none" stroke="#0c0a0933" strokeWidth="1.5" />
          <g transform="translate(176 112) scale(0.42) translate(0 -6)">
            {LOGO_PATHS.map((d) => (
              <path key={d} d={d} fill="#0c0a09" />
            ))}
          </g>
          <text x="198" y="178" textAnchor="middle" fontSize="11" fontFamily="var(--font-geist-mono), monospace" fill="#66615b">
            logo.svg
          </text>
        </g>
        {/* Cursor carrying the card */}
        <g transform="translate(226 160)">
          <path d="M0 0v18l5-5 4 9 3-1.5-4-8.5h7Z" fill="#0c0a09" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" style={anim("how-fade", 200, 1150, "reverse both")} />
        </g>
      </g>
      <Caption delay={1700}>Glisser · coller · parcourir</Caption>
    </g>
  );
}

let outlineDots: { x: number; y: number }[] | null = null;

/** Points along the real logo outline, like the tracer's vertices (measured once). */
function sampleOutline() {
  if (outlineDots) return outlineDots;
  if (typeof document === "undefined") return [];
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
  document.body.appendChild(svg);
  const dots: { x: number; y: number }[] = [];
  for (const d of LOGO_PATHS) {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
    const length = path.getTotalLength();
    const count = 18;
    for (let k = 0; k < count; k++) {
      const point = path.getPointAtLength((k / count) * length);
      dots.push({ x: point.x, y: point.y });
    }
  }
  svg.remove();
  outlineDots = dots;
  return dots;
}

function TraceVisual() {
  // Only ever rendered on the client (it is not the first step), so measuring here is safe.
  const [dots] = useState(sampleOutline);

  return (
    <g>
      <g style={anim("how-fade", 500)}>
        <Logo fill="#2f5bff" style={{ opacity: 0.12 }} />
      </g>
      {/* Scan line */}
      <g style={anim("how-scan", 1600, 100, "both", "ease-in-out")}>
        <rect x="100" y="148" width="200" height="2" fill="#2f5bff" opacity="0.5" />
        <rect x="100" y="132" width="200" height="16" fill="#2f5bff" opacity="0.06" />
      </g>
      {/* Outline drawn stroke by stroke */}
      <g transform={LOGO_TRANSFORM}>
        {LOGO_PATHS.map((d, index) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="#0c0a09"
            strokeWidth="1.2"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1"
            style={anim("how-draw", 1500, 300 + index * 350, "both", "cubic-bezier(0.65,0,0.35,1)")}
          />
        ))}
        {dots.map((dot, index) => (
          <circle
            key={index}
            cx={dot.x}
            cy={dot.y}
            r="1.6"
            fill="#fff"
            stroke="#2f5bff"
            strokeWidth="0.9"
            className="svg-box"
            style={anim("how-grow", 300, 500 + index * 38, "both", "cubic-bezier(0.3,1.12,0.4,1)")}
          />
        ))}
      </g>
      <Caption delay={2100}>2 formes · 36 points de contour</Caption>
    </g>
  );
}

function ExtrudeVisual() {
  return (
    <g>
      <Extrusion animate front={<Logo fill="#2f5bff" />} />
      {/* Depth readout */}
      <g style={anim("how-fade", 400, 1100)}>
        <path d="M296 102l20 16" stroke="#0c0a0966" strokeWidth="1" />
        <path d="M296 98v8M316 114v8" stroke="#0c0a0966" strokeWidth="1" />
        <rect x="300" y="122" width="58" height="22" rx="7" fill="#0c0a09" />
        <text x="329" y="137" textAnchor="middle" fontSize="11" fontFamily="var(--font-geist-mono), monospace" fill="#fff">
          P 14 mm
        </text>
      </g>
      <Caption delay={1500}>Extrudé · empilé · gonflé · relief</Caption>
    </g>
  );
}

const faceFills = [
  { fill: "url(#how-chrome)", label: "Chrome" },
  { fill: "url(#how-gold)", label: "Or" },
  { fill: "url(#how-glass)", label: "Verre" },
  { fill: "url(#how-holo)", label: "Holo" },
  { fill: "logo", label: "Couleurs du logo" },
];

function DressVisual() {
  return (
    <g>
      {/* Softbox above */}
      <g style={anim("how-fade", 500)}>
        <rect x="150" y="18" width="100" height="10" rx="5" fill="#fff" stroke="#0c0a091f" />
        <path d="M170 30l-14 30M200 30v30M230 30l14 30" stroke="#ffd98a" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      </g>
      <Extrusion
        animate={false}
        front={
          <g>
            {faceFills.map((face, index) => (
              <g
                key={face.label}
                style={{ animation: `how-cycle 5000ms linear ${index * 1000 - 200}ms infinite` }}
              >
                {face.fill === "logo" ? (
                  <g transform={LOGO_TRANSFORM}>
                    <path d={LOGO_PATHS[0]} fill="#2f5bff" />
                    <path d={LOGO_PATHS[1]} fill="#8aa3ff" />
                  </g>
                ) : (
                  <Logo fill={face.fill} />
                )}
              </g>
            ))}
            {/* Light sweeping across the face */}
            <g clipPath="url(#how-logo-clip)">
              <rect
                x="150"
                y="40"
                width="70"
                height="220"
                fill="url(#how-sweep)"
                style={{ animation: "how-sweep 1000ms cubic-bezier(0.65,0,0.35,1) 0ms infinite" }}
              />
            </g>
          </g>
        }
      />
      {/* Swatch rail synced with the face */}
      <g transform="translate(110 262)">
        {faceFills.map((face, index) => (
          <g key={face.label} transform={`translate(${index * 44} 0)`}>
            <circle cx="16" cy="12" r="11" fill={face.fill === "logo" ? "#2f5bff" : face.fill} stroke="#0c0a091f" />
            {face.fill === "logo" && <path d="M16 1a11 11 0 0 1 0 22Z" fill="#8aa3ff" />}
            <circle
              cx="16"
              cy="12"
              r="14.5"
              fill="none"
              stroke="#2f5bff"
              strokeWidth="1.6"
              style={{ animation: `how-cycle 5000ms linear ${index * 1000 - 200}ms infinite` }}
            />
          </g>
        ))}
      </g>
    </g>
  );
}

const files = [
  { ext: "PNG", detail: "4096 px" },
  { ext: "MP4", detail: "360° · 60 i/s" },
  { ext: "GLB", detail: "Web · RA" },
  { ext: "STL", detail: "Impression" },
];

function ExportVisual() {
  return (
    <g>
      <g transform="translate(-62 0)">
        <Extrusion animate={false} front={<Logo fill="url(#how-chrome)" />} />
      </g>
      {files.map((file, index) => (
        <g
          key={file.ext}
          transform={`translate(258 ${44 + index * 52})`}
        >
          <g className="svg-box" style={anim("how-fly", 650, 250 + index * 260, "both", "cubic-bezier(0.3,1.12,0.4,1)")}>
            <rect width="122" height="40" rx="11" fill="#fff" stroke="#0c0a091f" />
            <text x="14" y="25" fontSize="13" fontWeight="600" fontFamily="var(--font-geist-mono), monospace" fill={index === 1 ? "#2f5bff" : "#0c0a09"}>
              .{file.ext.toLowerCase()}
            </text>
            <text x="58" y="25" fontSize="9.5" fontFamily="var(--font-geist-sans), sans-serif" fill="#8c867f">
              {file.detail}
            </text>
            <rect x="14" y="32" width="94" height="2" rx="1" fill="#0c0a090f" />
            <rect
              x="14"
              y="32"
              width="94"
              height="2"
              rx="1"
              fill="#2f5bff"
              className="svg-box"
              style={{ transformOrigin: "left", transformBox: "fill-box", ...anim("how-bar", 700, 650 + index * 260, "both", "ease-out") }}
            />
          </g>
        </g>
      ))}
      <Caption delay={1900}>Un modèle, quatre sorties</Caption>
    </g>
  );
}

function Caption({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <text
      x="200"
      y="292"
      textAnchor="middle"
      fontSize="11"
      fontFamily="var(--font-geist-mono), monospace"
      letterSpacing="0.06em"
      fill="#8c867f"
      style={anim("how-fade", 500, delay)}
    >
      {children}
    </text>
  );
}

const visuals: Record<StepId, () => ReactNode> = {
  import: () => <ImportVisual />,
  trace: () => <TraceVisual />,
  extrude: () => <ExtrudeVisual />,
  dress: () => <DressVisual />,
  export: () => <ExportVisual />,
};

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [cycle, setCycle] = useState(0);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    const node = section.current;
    if (!node) return () => query.removeEventListener("change", update);
    // Only play while visible: no work off-screen, and the story starts when it is seen.
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      query.removeEventListener("change", update);
    };
  }, []);

  const select = (index: number) => {
    setActive(index);
    setCycle((value) => value + 1);
  };
  const next = () => select((active + 1) % steps.length);
  const step = steps[active];
  const autoplay = inView && !reduced;

  return (
    <section
      ref={section}
      id="how"
      className="frame scroll-mt-24 pt-[var(--section)]"
      aria-labelledby="how-title"
    >
      <Reveal className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-10 max-tab:grid-cols-1">
        <div>
          <p className="eyebrow">Comment ça marche</p>
          <h2 id="how-title" className="heading-section mt-5">
            Du plat au <span className="serif-accent">volume</span>, étape par étape.
          </h2>
        </div>
        <p className="text-lead max-w-[42ch] justify-self-end max-tab:justify-self-start">
          Voici ce que fait le studio, de votre fichier à l’objet fini. Aucun logiciel 3D, rien à
          apprendre : chaque étape est automatique et réglable.
        </p>
      </Reveal>

      <Reveal
        delay={80}
        className="mt-14 grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-stretch gap-5 max-tab:grid-cols-1"
      >
        {/* Steps */}
        <ol className="flex flex-col gap-2 max-tab:hidden" style={{ "--step-ms": `${STEP_MS}ms` } as CSSProperties}>
          {steps.map((item, index) => {
            const isActive = index === active;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => select(index)}
                  className={`focus-ring group relative w-full overflow-hidden rounded-[18px] p-4 text-left transition-[background-color,box-shadow] duration-300 [--ring-offset:2px] ${
                    isActive ? "bg-surface shadow-pane" : "hover:bg-well"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-[11px] transition-[background-color,color,scale] duration-300 ease-spring ${
                        isActive ? "scale-105 bg-accent text-white" : "bg-well-strong text-ink-3 group-hover:text-ink"
                      }`}
                    >
                      <Icon size={17} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="font-mono text-[11px] text-ink-4">0{index + 1}</span>
                        <span className={`text-[16px] font-semibold tracking-[-0.02em] ${isActive ? "text-ink" : "text-ink-2"}`}>
                          {item.title}
                        </span>
                      </span>
                    </span>
                  </span>
                  {/* Description unfolds for the active step only. */}
                  <span className="fold" data-open={isActive}>
                    <span>
                      <span className="block pl-12 pt-2 text-[14.5px] leading-[1.55] text-ink-3 [text-wrap:pretty]">
                        {item.body}
                      </span>
                    </span>
                  </span>
                  {isActive && (
                    <span aria-hidden="true" className="absolute inset-x-4 bottom-0 h-[2px] overflow-hidden rounded-full bg-well-strong">
                      {autoplay ? (
                        <span
                          key={cycle}
                          className="how-progress block h-full bg-accent"
                          onAnimationEnd={next}
                        />
                      ) : (
                        <span className="block h-full w-full bg-accent/40" />
                      )}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        {/* Stage */}
        <div className="relative overflow-hidden rounded-[26px] bg-night shadow-[inset_0_0_0_1px_var(--color-hairline)] max-tab:order-1">
          <div aria-hidden="true" className="grid-lines absolute inset-0 opacity-70 [mask-image:radial-gradient(70%_70%_at_50%_45%,#000,transparent)]" />
          <div className="absolute left-5 top-4 z-10 flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-ink-4">
            <MousePointer2 size={12} strokeWidth={2} className="text-accent" />
            ÉTAPE 0{active + 1} / 0{steps.length}
          </div>
          <svg
            key={`${step.id}-${cycle}`}
            viewBox="0 0 400 300"
            role="img"
            aria-label={`${step.title} : ${step.body}`}
            className="relative block aspect-[4/3] w-full"
          >
            <Defs />
            {visuals[step.id]()}
          </svg>
          {/* Phones: the description sits under the preview it explains, with step tabs. */}
          <div className="relative hidden border-t border-hairline bg-surface p-4 max-tab:block">
            <div className="flex gap-1.5" role="tablist" aria-label="Étapes">
              {steps.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={item.title}
                    onClick={() => select(index)}
                    className={`focus-ring grid h-9 flex-1 place-items-center rounded-[10px] transition-colors duration-300 [--ring-offset:2px] ${
                      isActive ? "bg-accent text-white" : "bg-well text-ink-3"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                  </button>
                );
              })}
            </div>
            <p className="mt-3.5 flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-ink-4">0{active + 1}</span>
              <span className="text-[16px] font-semibold tracking-[-0.02em] text-ink">{step.title}</span>
            </p>
            <p key={step.id} className="animate-rise mt-1.5 text-[14px] leading-[1.55] text-ink-3 [text-wrap:pretty]">
              {step.body}
            </p>
            <span aria-hidden="true" className="mt-3.5 block h-[2px] overflow-hidden rounded-full bg-well-strong">
              {autoplay ? (
                <span key={cycle} className="how-progress block h-full bg-accent" onAnimationEnd={next} />
              ) : (
                <span className="block h-full w-full bg-accent/40" />
              )}
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
