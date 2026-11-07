import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { HeroSceneLazy } from "@/components/landing/HeroSceneLazy";
import { GithubIcon } from "@/components/icons";
import { heroStageCss } from "@/lib/stage";
import { site } from "@/lib/site";

const promises = ["Gratuit, sans compte", "100 % dans le navigateur", "Code ouvert"];

export function Hero() {
  return (
    <section className="relative isolate pt-32 max-tab:pt-28">
      {/* Quiet drafting grid that fades out under the headline. */}
      <div
        aria-hidden="true"
        className="grid-lines pointer-events-none absolute inset-x-0 top-0 -z-10 h-[820px] [mask-image:radial-gradient(70%_70%_at_30%_10%,#000,transparent)]"
      />
      {/* A soft accent glow behind the stage. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[8%] top-40 -z-10 size-[520px] rounded-full bg-accent/10 blur-[110px] max-tab:hidden"
      />

      <div className="frame grid grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] items-center gap-14 max-desk:gap-10 max-tab:grid-cols-1">
        <div className="max-tab:text-center">
          {/* Credit, visible at the very top of the page. */}
          <a
            href={site.author.url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring group animate-rise inline-flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3.5 text-[13px] text-ink-3 shadow-pane transition-shadow duration-300 hover:shadow-float [--ring-offset:3px]"
          >
            <span className="grid size-6 place-items-center rounded-full bg-ink font-mono text-[10px] font-semibold text-white transition-transform duration-500 ease-spring group-hover:rotate-[-8deg] group-hover:scale-110">
              JA
            </span>
            Créé par <span className="font-medium text-ink">{site.author.name}</span>
            <ArrowUpRight
              size={13}
              strokeWidth={2}
              className="text-ink-4 transition-[translate,color] duration-300 ease-spring group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-accent"
            />
          </a>

          <h1 className="heading-hero animate-rise delay-1 mt-7 !text-[clamp(48px,6.6vw,100px)] max-tab:mx-auto max-tab:max-w-[12ch]">
            Votre logo, en <span className="serif-accent">relief.</span>
          </h1>

          <p className="text-lead animate-rise delay-2 mt-7 max-w-[46ch] max-tab:mx-auto">
            Déposez un SVG ou un PNG : il devient un objet 3D à taille réelle, éclairé comme en studio
            photo. Verre, chrome, or ou les couleurs mêmes de votre logo. Rendez-le, animez-le,
            imprimez-le.
          </p>

          <div className="animate-rise delay-3 mt-9 flex flex-wrap items-center gap-3 max-tab:justify-center">
            <Link
              href="/studio"
              className="focus-ring group inline-flex h-12 items-center gap-2 rounded-[14px] bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-[0_8px_20px_-8px_rgba(12,10,9,.5)] press [--press:.96] [--ring-offset:3px]"
            >
              Ouvrir le studio
              <ArrowRight
                size={16}
                strokeWidth={2}
                className="transition-transform duration-300 ease-spring group-hover:translate-x-1"
              />
            </Link>
            <a
              href={site.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring group inline-flex h-12 items-center gap-2 rounded-[14px] bg-surface px-5 text-[15px] font-medium text-ink-2 shadow-raise transition-[color,box-shadow] duration-200 hover:text-ink hover:shadow-float press [--press:.96] [--ring-offset:3px]"
            >
              <GithubIcon size={17} className="transition-transform duration-500 ease-spring group-hover:rotate-[-10deg]" />
              Voir le code
            </a>
          </div>

          <ul className="animate-rise delay-4 mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-ink-3 max-tab:justify-center">
            {promises.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <span className="grid size-4 place-items-center rounded-full bg-accent-soft text-accent">
                  <Check size={10} strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* The live stage. */}
        <div className="animate-rise delay-2">
          <div
            className="relative aspect-[5/6] overflow-hidden rounded-[30px] shadow-float max-desk:aspect-[4/5] max-tab:mx-auto max-tab:aspect-[4/5] max-tab:max-w-[560px] max-phone:rounded-[22px]"
            style={{ background: heroStageCss }}
          >
            <span className="pointer-events-none absolute left-5 top-5 z-10 flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-ink-4">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/50" />
                <span className="relative size-2 rounded-full bg-accent" />
              </span>
              EN DIRECT · BOUGEZ LA SOURIS
            </span>
            <HeroSceneLazy />
          </div>
        </div>
      </div>
    </section>
  );
}
