import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { HeroSceneLazy } from "@/components/landing/HeroSceneLazy";
import { heroStageCss } from "@/lib/stage";

export function Hero() {
  return (
    <section className="relative isolate pt-36 max-tab:pt-28">
      {/* Quiet drafting grid that fades out under the headline. */}
      <div
        aria-hidden="true"
        className="grid-lines pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] [mask-image:radial-gradient(60%_70%_at_50%_0%,#000,transparent)]"
      />

      <div className="frame flex flex-col items-center text-center">
        <p className="animate-rise inline-flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-[13px] text-ink-3 shadow-pane">
          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[11px] font-medium text-accent">
            NOUVEAU
          </span>
          Vidéos 360° et ambiances en un clic
        </p>

        <h1 className="heading-hero animate-rise delay-1 mt-7 max-w-[13ch]">
          Votre logo, en <span className="serif-accent">relief.</span>
        </h1>

        <p className="text-lead animate-rise delay-2 mt-7 max-w-[52ch]">
          Déposez un SVG ou un PNG et obtenez un objet 3D à taille réelle, éclairé comme en
          studio photo : verre, chrome, or ou la couleur de votre choix. Rendez-le, animez-le,
          imprimez-le.
        </p>

        <div className="animate-rise delay-3 mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/studio"
            className="focus-ring group inline-flex h-12 items-center gap-2 rounded-[14px] bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-[0_8px_20px_-8px_rgba(12,10,9,.5)] press [--press:.96] [--ring-offset:3px]"
          >
            Ouvrir le studio
            <ArrowRight
              size={16}
              strokeWidth={2}
              className="transition-transform duration-300 ease-spring group-hover:translate-x-0.5"
            />
          </Link>
          <a
            href="#how"
            className="focus-ring inline-flex h-12 items-center rounded-[14px] bg-surface px-6 text-[15px] font-medium text-ink-2 shadow-raise transition-colors duration-200 hover:text-ink [--ring-offset:3px]"
          >
            Voir comment ça marche
          </a>
        </div>

        <p className="animate-rise delay-4 mt-6 flex items-center gap-1.5 text-[13px] text-ink-4">
          <Lock size={13} strokeWidth={2} />
          Gratuit, sans compte. Vos fichiers ne quittent jamais votre appareil.
        </p>
      </div>

      {/* The live stage. */}
      <div className="frame animate-rise delay-3 mt-16 max-tab:mt-12">
        <div
          className="relative aspect-[16/8.4] overflow-hidden rounded-[28px] shadow-float max-desk:aspect-[16/10] max-tab:aspect-[4/5] max-phone:rounded-[22px]"
          style={{ background: heroStageCss }}
        >
          <span className="pointer-events-none absolute left-5 top-5 z-10 flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-ink-4">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/50" />
              <span className="relative size-2 rounded-full bg-accent" />
            </span>
            EN DIRECT — BOUGEZ LA SOURIS
          </span>
          <HeroSceneLazy />
        </div>
      </div>
    </section>
  );
}
