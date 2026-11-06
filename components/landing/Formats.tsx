import { Reveal } from "@/components/motion";

const formats = [
  {
    ext: "PNG",
    color: "text-ink",
    title: "For screens",
    points: ["1K, 2K or 4K square", "Transparent or with backdrop", "Bloom and tone mapping baked in"],
  },
  {
    ext: "MP4",
    color: "text-ink",
    title: "For social",
    points: ["Seamless 360° turntable loop", "1:1, 9:16 or 16:9", "Backdrop and lighting included"],
  },
  {
    ext: "GLB",
    color: "text-ink",
    title: "For the web & AR",
    points: ["Binary glTF 2.0", "Sized in metres", "Drops into three.js, Spline, Blender"],
  },
  {
    ext: "STL",
    color: "text-ink",
    title: "For printing",
    points: ["Closed, watertight mesh", "Sized in millimetres", "Ready for any slicer"],
  },
];

export function Formats() {
  return (
    <section
      id="formats"
      className="frame scroll-mt-24 pt-[var(--section)]"
      aria-labelledby="formats-title"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-12 max-desk:grid-cols-1">
        <Reveal>
          <p className="eyebrow">Exports</p>
          <h2 id="formats-title" className="heading-section mt-5">
            One model, <span className="serif-accent">four</span> ways out.
          </h2>
          <p className="text-lead mt-6 max-w-[40ch]">
            The same solid you see in the viewport is what you get, whether it ends up on a
            website, in a 3D scene or on a print bed.
          </p>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 max-fold:grid-cols-1">
          {formats.map((format, index) => (
            <Reveal
              as="article"
              key={format.ext}
              delay={index * 70}
              className="panel flex flex-col rounded-[22px] p-6 transition-shadow duration-300 hover:shadow-float"
            >
              <span className={`font-mono text-[30px] font-medium tracking-[-0.04em] ${format.color}`}>
                <span className="text-accent">.</span>
                {format.ext.toLowerCase()}
              </span>
              <h3 className="mt-6 text-[16px] font-semibold">{format.title}</h3>
              <ul className="mt-3 space-y-2 text-[14px] leading-[1.45] text-ink-3">
                {format.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-4" />
                    {point}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
