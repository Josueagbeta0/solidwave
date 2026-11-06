import { Reveal } from "@/components/motion";

const faqs = [
  {
    q: "Do I need to know 3D software?",
    a: "Not at all. Import a file, pick a form and a finish, and the studio handles geometry, lighting and rendering. Every setting has a sensible default and a one-line explanation.",
  },
  {
    q: "Which files can I import?",
    a: "SVG gives the most accurate result because its paths are used directly. PNG, JPG and WebP are traced automatically; a mark with a clear silhouette on a plain or transparent background works best.",
  },
  {
    q: "Are my files uploaded anywhere?",
    a: "No. Tracing, modelling and rendering all run locally in your browser using your GPU. Nothing is sent to a server.",
  },
  {
    q: "How big can the PNG renders be?",
    a: "Up to 4096 × 4096 pixels. Smaller sizes are supersampled for extra-clean edges. 4K needs a reasonably recent GPU; if it fails, 2K always works.",
  },
  {
    q: "Can I export an animation?",
    a: "Yes. Record a seamless 360° turntable loop in square, vertical or landscape format, with your backdrop and lighting. It saves as MP4 in Chrome and Edge, and WebM elsewhere.",
  },
  {
    q: "What are Looks?",
    a: "Complete art directions applied in one click: finish, lighting, backdrop, floor and post-processing tuned together. Every setting stays editable afterwards.",
  },
  {
    q: "Can I 3D print the result?",
    a: "Yes. STL exports are closed meshes measured in millimetres, using the width, height and depth you set in the studio.",
  },
  {
    q: "Can I use the renders commercially?",
    a: "Your renders are yours. Just make sure you have the rights to the logo or artwork you import.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="frame scroll-mt-24 pt-[var(--section)]" aria-labelledby="faq-title">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-12 max-tab:grid-cols-1">
        <Reveal>
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-title" className="heading-section mt-5">
            Good questions, <span className="serif-accent">straight</span> answers.
          </h2>
        </Reveal>
        <Reveal delay={100} className="divide-y divide-hairline border-y border-hairline">
          {faqs.map((item) => (
            <details key={item.q} className="group py-1">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-6 rounded-lg py-5 text-[17px] font-medium tracking-[-0.015em] text-ink transition-colors duration-200 hover:text-accent [--ring-offset:2px] [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden="true"
                  className="relative grid size-7 shrink-0 place-items-center rounded-full bg-well-strong transition-transform duration-300 group-open:rotate-45"
                >
                  <span className="absolute h-px w-3 bg-ink-2" />
                  <span className="absolute h-3 w-px bg-ink-2" />
                </span>
              </summary>
              <p className="max-w-[62ch] pb-5 text-[15px] leading-[1.65] text-ink-3">{item.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
