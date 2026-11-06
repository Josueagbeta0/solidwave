import { Reveal } from "@/components/motion";
import { looks } from "@/lib/studio/looks";
import { lightRigs } from "@/lib/studio/lighting";
import { finishById } from "@/lib/studio/materials";

function Tile({
  className = "",
  delay = 0,
  dark = false,
  title,
  body,
  children,
}: {
  className?: string;
  delay?: number;
  dark?: boolean;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal
      delay={delay}
      className={`group flex flex-col overflow-hidden rounded-[24px] p-7 max-phone:p-5 ${
        dark ? "bg-primary text-primary-foreground" : "panel"
      } ${className}`}
    >
      <div className="relative min-h-0 flex-1">{children}</div>
      <h3 className="mt-6 text-[19px] font-semibold tracking-[-0.03em]">{title}</h3>
      <p
        className={`mt-2 max-w-[44ch] text-[14.5px] leading-[1.55] [text-wrap:pretty] ${
          dark ? "text-white/60" : "text-ink-3"
        }`}
      >
        {body}
      </p>
    </Reveal>
  );
}

export function Features() {
  return (
    <section
      id="features"
      className="frame scroll-mt-24 pt-[var(--section)]"
      aria-labelledby="features-title"
    >
      <Reveal className="max-w-[720px]">
        <p className="eyebrow">The studio</p>
        <h2 id="features-title" className="heading-section mt-5">
          Product-shot quality, <span className="serif-accent">without</span> the photo studio.
        </h2>
      </Reveal>

      <div className="mt-14 grid auto-rows-[minmax(300px,auto)] grid-cols-6 gap-4 max-tab:grid-cols-2 max-fold:grid-cols-1">
        {/* Looks */}
        <Tile
          dark
          className="col-span-4 row-span-2 max-tab:col-span-2 max-fold:col-span-1"
          title="One-click Looks"
          body="Eight complete art directions — finish, lighting, backdrop, floor and post-processing tuned together. Start from one, then tweak anything."
        >
          <div className="grid h-full grid-cols-4 gap-3 max-fold:grid-cols-2">
            {looks.map((look, index) => (
              <div
                key={look.id}
                className="flex flex-col gap-2 transition-transform duration-500 ease-spring group-hover:-translate-y-1"
                style={{ transitionDelay: `${index * 30}ms` }}
              >
                <div
                  className="grid aspect-[4/5] place-items-center rounded-[14px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]"
                  style={{ background: look.preview }}
                >
                  <span
                    aria-hidden="true"
                    className="block size-11 rounded-full shadow-[0_10px_20px_-8px_rgba(0,0,0,.7)]"
                    style={{ background: finishById(look.finish).swatch }}
                  />
                </div>
                <span className="text-[12.5px] text-white/70">{look.name}</span>
              </div>
            ))}
          </div>
        </Tile>

        {/* Turntable video */}
        <Tile
          delay={80}
          className="col-span-2 max-fold:col-span-1"
          title="Turntable video"
          body="A seamless 360° loop in square, vertical or landscape, ready for social."
        >
          <div className="grid h-full min-h-[140px] place-items-center">
            <div className="relative size-28 [perspective:400px]">
              <div className="absolute inset-0 animate-[spin-y_6s_linear_infinite] rounded-full shadow-[0_18px_30px_-14px_rgba(12,10,9,.5)] [transform-style:preserve-3d]" style={{ background: finishById("chrome").swatch }} />
              <span className="absolute -bottom-4 left-1/2 h-3 w-20 -translate-x-1/2 rounded-[50%] bg-ink/15 blur-[6px]" />
            </div>
          </div>
        </Tile>

        {/* Lighting */}
        <Tile
          delay={120}
          className="col-span-2 max-fold:col-span-1"
          title="Studio lighting"
          body="Five rigs of softboxes and strip lights you can walk around the object."
        >
          <div className="flex h-full min-h-[140px] items-center gap-2">
            {lightRigs.map((rig) => (
              <div key={rig.id} className="flex flex-1 flex-col items-center gap-2">
                <span
                  className="block h-24 w-full rounded-[12px] shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)] transition-[height] duration-500 ease-spring group-hover:h-28"
                  style={{ background: rig.swatch }}
                />
                <span className="text-[11px] text-ink-4">{rig.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </Tile>

        {/* Shadows */}
        <Tile
          delay={60}
          className="col-span-2 max-fold:col-span-1"
          title="Soft shadows & mirror floors"
          body="Area shadows from an overhead softbox, or a blurred mirror that melts into the backdrop."
        >
          <div className="grid h-full min-h-[140px] place-items-center">
            <div className="relative">
              <span
                className="block size-20 rounded-full transition-transform duration-700 ease-spring group-hover:-translate-y-3"
                style={{ background: finishById("ceramic").swatch }}
              />
              <span className="absolute -bottom-5 left-1/2 h-4 w-24 -translate-x-1/2 rounded-[50%] bg-ink/25 blur-[8px] transition-[opacity,width] duration-700 group-hover:w-20 group-hover:opacity-60" />
            </div>
          </div>
        </Tile>

        {/* 4K */}
        <Tile
          delay={100}
          className="col-span-2 max-fold:col-span-1"
          title="Renders up to 4K"
          body="Transparent or with the backdrop baked in. Small sizes are supersampled for clean edges."
        >
          <div className="flex h-full min-h-[140px] items-end">
            <span className="text-[88px] font-semibold leading-none tracking-[-0.06em] max-phone:text-[68px]">
              4096
              <span className="ml-1 font-mono text-[15px] font-normal tracking-normal text-ink-4">px</span>
            </span>
          </div>
        </Tile>

        {/* Millimetres */}
        <Tile
          delay={140}
          className="col-span-2 max-fold:col-span-1"
          title="Real millimetres"
          body="Width, height and depth are true sizes, carried through to STL and GLB."
        >
          <div className="flex h-full min-h-[140px] flex-col justify-center">
            <div className="flex h-10 items-end justify-between border-b border-ink/70">
              {Array.from({ length: 21 }, (_, index) => (
                <span
                  key={index}
                  className="w-px bg-ink/70"
                  style={{ height: index % 10 === 0 ? 28 : index % 5 === 0 ? 18 : 10 }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-4">
              <span>0</span>
              <span>50</span>
              <span>100 mm</span>
            </div>
          </div>
        </Tile>
      </div>
    </section>
  );
}
