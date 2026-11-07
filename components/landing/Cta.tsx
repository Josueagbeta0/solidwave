import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion";

export function Cta() {
  return (
    <section className="frame pb-24 pt-[var(--section)]" aria-labelledby="cta-title">
      <Reveal className="relative isolate overflow-hidden [contain:paint] rounded-[32px] bg-[#05040c] px-8 py-24 text-center text-primary-foreground max-fold:rounded-[24px] max-fold:px-6 max-fold:py-16">
        {/* Oversized ghost of the mark, lit from above by a soft accent glow. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          {/* Slowly drifting colour fields that blend into each other: the studio's "magic". */}
          {/* Grainy light gradient: black corner, electric indigo, a white-lavender glow that drifts slowly. */}
          <div className="absolute inset-0 bg-[#05040c]" />
          <div className="cta-swirl cta-indigo" />
          <div className="cta-swirl cta-violet" />
          <div className="cta-swirl cta-shadow" />
          <div className="cta-grain absolute inset-0 opacity-[0.32] mix-blend-overlay" />
          
        </div>
        <h2 id="cta-title" className="heading-section mx-auto max-w-[14ch]">
          Donnez du <span className="serif-accent">poids</span> à vos idées.
        </h2>
        <p className="mx-auto mt-6 max-w-[44ch] text-[18px] leading-[1.55] text-white/75 [text-wrap:pretty]">
          Un logo ou une photo, et votre objet 3D est prêt en une minute. Gratuit, rien à installer.
        </p>
        <Link
          href="/studio"
          className="focus-ring group mt-10 inline-flex h-12 items-center gap-2 rounded-[14px] bg-white px-6 text-[15px] font-medium text-ink press [--press:.96] [--ring-offset:3px]"
        >
          Ouvrir le studio
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
