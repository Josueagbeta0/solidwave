import { finishes } from "@/lib/studio/materials";

const steps = [
  {
    n: "01",
    title: "Drop anything flat",
    body: "SVG paths are read exactly. PNG, JPG and WebP are traced into clean vector outlines, with holes, counters and fine detail kept.",
    art: (
      <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden="true">
        <rect x="40" y="18" width="80" height="64" rx="10" fill="none" stroke="#ffffff22" strokeDasharray="4 4" />
        <path d="M58 52C64 40 72 40 78 52S92 64 102 52V60C92 72 84 72 78 60S64 48 58 60Z" fill="#b7bdcc" />
        <path d="M80 6v20M72 18l8 8 8-8" fill="none" stroke="#39e1ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "Give it depth",
    body: `Extrude, stack, inflate or emboss. Set width, height and depth in millimetres, round the edges, then pick from ${finishes.length} finishes.`,
    art: (
      <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="step2" x1="0" x2="1">
            <stop offset="0" stopColor="#39e1ff" />
            <stop offset=".5" stopColor="#5b7cff" />
            <stop offset="1" stopColor="#9b5cff" />
          </linearGradient>
        </defs>
        <path d="M50 56C58 40 68 40 76 56S94 72 106 56V68C94 84 84 84 76 68S58 52 50 68Z" fill="#ffffff14" transform="translate(8 -8)" />
        <path d="M50 56C58 40 68 40 76 56S94 72 106 56V68C94 84 84 84 76 68S58 52 50 68Z" fill="url(#step2)" />
        <path d="M50 56l8 -8M106 56l8 -8M106 68l8 -8" stroke="#ffffff33" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Ship it anywhere",
    body: "Render a 4K PNG with or without the backdrop, drop a GLB into three.js or Spline, or send an STL to your 3D printer.",
    art: (
      <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden="true">
        {["PNG", "GLB", "STL"].map((label, index) => (
          <g key={label} transform={`translate(${28 + index * 38} ${30 + (index % 2) * 10})`}>
            <rect width="30" height="38" rx="6" fill="#ffffff0d" stroke="#ffffff22" />
            <text x="15" y="24" textAnchor="middle" fontSize="8" fontFamily="monospace" fill={index === 0 ? "#39e1ff" : index === 1 ? "#5b7cff" : "#ff5cc8"}>
              {label}
            </text>
          </g>
        ))}
      </svg>
    ),
  },
];

export function Steps() {
  return (
    <section id="how" className="frame scroll-mt-24 pt-[var(--section)]" aria-labelledby="how-title">
      <div className="max-w-[640px]">
        <p className="eyebrow">How it works</p>
        <h2 id="how-title" className="heading-section mt-4">
          Three moves from flat to finished.
        </h2>
      </div>
      <ol className="mt-14 grid grid-cols-3 gap-4 max-tab:grid-cols-1">
        {steps.map((step) => (
          <li
            key={step.n}
            className="panel group relative overflow-hidden rounded-[22px] p-6 transition-transform duration-500 ease-spring hover:-translate-y-1"
          >
            <div className="grid-lines mb-6 h-[150px] overflow-hidden rounded-[14px] bg-night shadow-[inset_0_0_0_1px_var(--color-hairline)]">
              {step.art}
            </div>
            <span className="text-wave font-mono text-[13px] font-semibold">{step.n}</span>
            <h3 className="font-display mt-2 text-[22px] font-semibold tracking-[-0.03em]">
              {step.title}
            </h3>
            <p className="mt-3 text-[15px] leading-[1.6] text-ink-3">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
