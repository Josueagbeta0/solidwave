import { Reveal } from "@/components/motion";
import { finishes } from "@/lib/studio/materials";

const ink = "#0c0a09";
const accent = "#2f5bff";
const wave = "M58 52C64 40 72 40 78 52S92 64 102 52V60C92 72 84 72 78 60S64 48 58 60Z";

const steps = [
  {
    n: "01",
    title: "Déposez un visuel plat",
    body: "Les tracés SVG sont lus à l’identique. Les PNG, JPG et WebP sont vectorisés en contours nets, trous et détails fins compris.",
    art: (
      <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden="true">
        <rect x="38" y="20" width="84" height="62" rx="12" fill="#fff" stroke="#0c0a0926" strokeDasharray="4 4" />
        <path d={wave} fill={ink} />
        <path d="M80 4v16M73 13l7 7 7-7" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "Donnez-lui du volume",
    body: `Extrudé, empilé, gonflé ou en relief, en vrais millimètres, avec des arêtes arrondies ou chanfreinées, puis ${finishes.length} finitions au choix.`,
    art: (
      <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden="true">
        <path d={wave} fill="#0c0a091a" transform="translate(9 -9)" />
        <path d="M58 52l9-9M102 52l9-9M102 60l9-9M58 60l9-9" stroke="#0c0a0933" />
        <path d={wave} fill={accent} />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Exportez partout",
    body: "Générez un PNG en 4K, enregistrez une vidéo 360° qui boucle, ou exportez en GLB pour le web et en STL pour l’impression.",
    art: (
      <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden="true">
        {["PNG", "MP4", "GLB", "STL"].map((label, index) => (
          <g key={label} transform={`translate(${20 + index * 32} ${28 + (index % 2) * 10})`}>
            <rect width="26" height="34" rx="6" fill="#fff" stroke="#0c0a0926" />
            <text x="13" y="21" textAnchor="middle" fontSize="7" fontFamily="monospace" fill={index === 1 ? accent : ink}>
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
      <Reveal className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-10 max-tab:grid-cols-1">
        <div>
          <p className="eyebrow">Fonctionnement</p>
          <h2 id="how-title" className="heading-section mt-5">
            Du plat au <span className="serif-accent">volume</span> en trois gestes.
          </h2>
        </div>
        <p className="text-lead max-w-[42ch] justify-self-end max-tab:justify-self-start">
          Aucun logiciel 3D, rien à apprendre. Chaque réglage a une valeur par défaut sensée et
          une explication d’une ligne.
        </p>
      </Reveal>

      <ol className="mt-16 grid grid-cols-3 gap-5 max-tab:grid-cols-1">
        {steps.map((step, index) => (
          <Reveal as="li" key={step.n} delay={index * 90} className="group">
            <div className="h-[200px] overflow-hidden rounded-[22px] bg-night shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-[box-shadow,background-color] duration-300 group-hover:bg-stage">
              <div className="h-full p-6 transition-transform duration-500 ease-spring group-hover:scale-[1.03]">
                {step.art}
              </div>
            </div>
            <div className="mt-6 flex items-baseline gap-3">
              <span className="font-mono text-[12px] text-accent">{step.n}</span>
              <h3 className="text-[21px] font-semibold tracking-[-0.03em]">{step.title}</h3>
            </div>
            <p className="mt-2.5 max-w-[38ch] pl-[30px] text-[15px] leading-[1.6] text-ink-3 [text-wrap:pretty]">
              {step.body}
            </p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
