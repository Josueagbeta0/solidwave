import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { Reveal } from "@/components/motion";

export function Cta() {
  return (
    <section className="frame pb-24 pt-[var(--section)]" aria-labelledby="cta-title">
      <Reveal className="relative isolate overflow-hidden rounded-[32px] bg-primary px-8 py-24 text-center text-primary-foreground max-fold:rounded-[24px] max-fold:px-6 max-fold:py-16">
        {/* Oversized ghost of the mark, lit from above by a soft accent glow. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/40 blur-[120px]" />
          <LogoMark size={560} className="absolute -bottom-40 left-1/2 -translate-x-1/2 text-white/[0.04]" />
        </div>
        <h2 id="cta-title" className="heading-section mx-auto max-w-[14ch]">
          Give your logo some <span className="serif-accent">weight.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[44ch] text-[18px] leading-[1.55] text-white/60 [text-wrap:pretty]">
          Free, in your browser, and nothing to install. Your first render takes about a minute.
        </p>
        <Link
          href="/studio"
          className="focus-ring group mt-10 inline-flex h-12 items-center gap-2 rounded-[14px] bg-white px-6 text-[15px] font-medium text-ink press [--press:.96] [--ring-offset:3px]"
        >
          Open the studio
          <ArrowRight
            size={16}
            strokeWidth={2}
            className="transition-transform duration-300 ease-spring group-hover:translate-x-0.5"
          />
        </Link>
      </Reveal>
    </section>
  );
}
