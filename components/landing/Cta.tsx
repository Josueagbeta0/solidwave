import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { Reveal } from "@/components/motion";

export function Cta() {
  return (
    <section className="frame pb-24 pt-[var(--section)]" aria-labelledby="cta-title">
      <Reveal className="relative isolate overflow-hidden [contain:paint] rounded-[32px] bg-primary px-8 py-24 text-center text-primary-foreground max-fold:rounded-[24px] max-fold:px-6 max-fold:py-16">
        {/* Oversized ghost of the mark, lit from above by a soft accent glow. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          {/* Slowly drifting colour fields that blend into each other: the studio's "magic". */}
          {/* Pre-softened radial gradients, moved by transform only: no blur filter to recompute each frame. */}
          <div className="absolute inset-[-20%] opacity-95">
            <span className="aurora-blob [--c:#2f5bff]" style={{ left: "0%", top: "26%", animationDuration: "34s" }} />
            <span className="aurora-blob [--c:#1e3a8a]" style={{ left: "44%", top: "0%", animationDuration: "41s", animationDelay: "-12s" }} />
            <span className="aurora-blob [--c:#5b7cff]" style={{ left: "42%", top: "44%", animationDuration: "38s", animationDelay: "-20s" }} />
            <span className="aurora-blob opacity-60 [--c:#6d5bd0]" style={{ left: "16%", top: "50%", animationDuration: "45s", animationDelay: "-7s" }} />
          </div>
          {/* Fine colour dust drifting over the liquid. */}
          <div className="absolute inset-0 [mask-image:radial-gradient(75%_70%_at_50%_50%,#000,transparent)]">
            <div className="color-dust absolute inset-x-0 top-0 h-[calc(100%+260px)] opacity-50" />
          </div>
          {/* Keeps the text readable over the colours. */}
          <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_50%,rgba(12,10,9,.55),rgba(12,10,9,.15))]" />
          <LogoMark size={560} className="absolute -bottom-40 left-1/2 -translate-x-1/2 text-white/[0.05]" />
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
