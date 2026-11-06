import { Aperture, Lightbulb, Lock, Ruler, ScanLine, Sparkles } from "lucide-react";
import { lightRigs } from "@/lib/studio/lighting";

export function RenderFeatures() {
  return (
    <section
      id="render"
      className="frame scroll-mt-24 pt-[var(--section)]"
      aria-labelledby="render-title"
    >
      <div className="max-w-[680px]">
        <p className="eyebrow">Render engine</p>
        <h2 id="render-title" className="heading-section mt-4">
          A product photo studio, <span className="text-wave">in a browser tab.</span>
        </h2>
        <p className="text-lead mt-6 max-w-[54ch]">
          Every frame is lit, reflected and tone-mapped the way a 3D artist would set it up, with
          none of the setup.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-6 gap-4 max-tab:grid-cols-2 max-fold:grid-cols-1">
        {/* Lighting rigs, large */}
        <article className="panel col-span-4 overflow-hidden rounded-[24px] p-7 max-tab:col-span-2 max-fold:col-span-1">
          <Lightbulb size={20} strokeWidth={1.6} className="text-wave-cyan" />
          <h3 className="font-display mt-4 text-[24px] font-semibold tracking-[-0.03em]">
            Lighting rigs that flatter
          </h3>
          <p className="mt-2 max-w-[48ch] text-[15px] leading-[1.6] text-ink-3">
            Five softbox setups, from clean catalogue light to neon wave rims. Rotate them around
            the object and watch reflections slide across the surface.
          </p>
          <div className="mt-7 grid grid-cols-5 gap-2 max-fold:grid-cols-3">
            {lightRigs.map((rig) => (
              <div key={rig.id}>
                <span
                  aria-hidden="true"
                  className="block aspect-[4/3] rounded-[12px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)]"
                  style={{ background: rig.swatch }}
                />
                <span className="mt-2 block text-[12.5px] text-ink-3">{rig.name}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel col-span-2 rounded-[24px] p-7 max-fold:col-span-1">
          <ScanLine size={20} strokeWidth={1.6} className="text-wave-indigo" />
          <h3 className="font-display mt-4 text-[22px] font-semibold tracking-[-0.03em]">
            Mirror floor
          </h3>
          <p className="mt-2 text-[15px] leading-[1.6] text-ink-3">
            A blurred, depth-faded reflection plus a soft contact shadow ground the object like a
            real tabletop shot.
          </p>
          <div className="relative mt-6 h-24 overflow-hidden rounded-[14px] bg-night">
            <div className="absolute left-1/2 top-3 h-10 w-16 -translate-x-1/2 rounded-[10px] bg-wave" />
            <div className="absolute left-1/2 top-[58px] h-10 w-16 -translate-x-1/2 scale-y-[-1] rounded-[10px] bg-wave opacity-25 blur-[3px] [mask-image:linear-gradient(#000,transparent)]" />
            <div className="absolute inset-x-0 top-[56px] h-px bg-white/10" />
          </div>
        </article>

        {[
          {
            icon: <Sparkles size={20} strokeWidth={1.6} className="text-wave-violet" />,
            title: "Post effects",
            body: "AgX tone mapping, soft bloom on highlights, optional lens fringe and film grain.",
          },
          {
            icon: <Aperture size={20} strokeWidth={1.6} className="text-wave-magenta" />,
            title: "Up to 4K PNG",
            body: "Supersampled renders with a transparent background or your backdrop baked in.",
          },
          {
            icon: <Ruler size={20} strokeWidth={1.6} className="text-wave-cyan" />,
            title: "True to size",
            body: "Dimensions in millimetres, carried through to STL and GLB, so prints come out right.",
          },
        ].map((item) => (
          <article key={item.title} className="panel col-span-2 rounded-[24px] p-7 max-tab:col-span-1">
            {item.icon}
            <h3 className="font-display mt-4 text-[20px] font-semibold tracking-[-0.03em]">
              {item.title}
            </h3>
            <p className="mt-2 text-[15px] leading-[1.6] text-ink-3">{item.body}</p>
          </article>
        ))}

        <article className="panel ring-wave col-span-6 flex flex-wrap items-center justify-between gap-6 rounded-[24px] p-7 max-tab:col-span-2 max-fold:col-span-1">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-well-strong">
              <Lock size={20} strokeWidth={1.6} className="text-wave-cyan" />
            </span>
            <div>
              <h3 className="font-display text-[20px] font-semibold tracking-[-0.03em]">
                Private by design
              </h3>
              <p className="mt-1 text-[15px] text-ink-3">
                Tracing, modelling and rendering all run on your GPU. Nothing is uploaded, ever.
              </p>
            </div>
          </div>
          <span className="font-mono text-[12px] text-ink-4">WebGL 2 · three.js · runs offline once loaded</span>
        </article>
      </div>
    </section>
  );
}
