import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { HeroScene } from "@/components/landing/HeroScene";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-28 max-tab:pt-24">
      {/* Backdrop: drifting wave light + faint grid */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)]" />
        <div className="absolute -left-[10%] top-[8%] h-[520px] w-[520px] animate-drift rounded-full bg-wave-cyan/20 blur-[120px]" />
        <div className="absolute right-[-8%] top-[20%] h-[560px] w-[560px] animate-drift rounded-full bg-wave-violet/25 blur-[140px] [animation-delay:-6s]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-shell" />
      </div>

      <div className="frame grid grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-center gap-10 max-tab:grid-cols-1">
        <div className="max-tab:text-center">
          <p className="eyebrow animate-rise inline-flex items-center gap-2 rounded-full border border-hairline bg-well px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-wave-cyan shadow-[0_0_8px_#39e1ff]" />
            Browser-based 3D studio
          </p>
          <h1 className="heading-hero animate-rise delay-1 mt-6">
            Make your logo <span className="text-wave">solid.</span>
          </h1>
          <p className="text-lead animate-rise delay-2 mt-6 max-w-[46ch] max-tab:mx-auto">
            Drop in an SVG or PNG. SolidWave traces it, gives it real depth and lights it like a
            product shoot, in glass, chrome, gold or any colour you want.
          </p>
          <div className="animate-rise delay-3 mt-9 flex flex-wrap items-center gap-3 max-tab:justify-center">
            <Link
              href="/studio"
              className="focus-ring group bg-wave inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white shadow-glow press [--press:.96] [--ring-offset:3px]"
            >
              Start creating, it&apos;s free
              <ArrowRight
                size={16}
                strokeWidth={2.2}
                className="transition-transform duration-300 ease-spring group-hover:translate-x-0.5"
              />
            </Link>
            <a
              href="#how"
              className="focus-ring inline-flex h-12 items-center rounded-full border border-hairline-strong px-6 text-[15px] font-medium text-ink-2 transition-colors hover:bg-well hover:text-ink [--ring-offset:3px]"
            >
              See how it works
            </a>
          </div>
          <p className="animate-rise delay-4 mt-7 flex items-center gap-2 text-[13px] text-ink-4 max-tab:justify-center">
            <ShieldCheck size={15} strokeWidth={1.8} className="text-wave-cyan" />
            Your files never leave your device.
          </p>
        </div>

        <div className="animate-rise delay-2 relative">
          <div className="panel ring-wave relative aspect-[1/1.02] overflow-hidden rounded-[28px] max-tab:aspect-square max-fold:aspect-[1/1.15]">
            <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_20%,#1e1f5c_0%,#0a0b1e_55%,#05060d_100%)]" />
            <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
            </div>
            <span className="absolute right-4 top-3.5 z-10 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[10.5px] text-white/60 backdrop-blur">
              LIVE · try it
            </span>
            <HeroScene />
          </div>
        </div>
      </div>
    </section>
  );
}
