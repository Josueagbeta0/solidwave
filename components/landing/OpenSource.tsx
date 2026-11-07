import { ArrowUpRight, Code2, Cpu, ShieldCheck } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { site } from "@/lib/site";

const points = [
  { icon: ShieldCheck, title: "Privé par conception", body: "Aucun serveur : vos fichiers restent sur votre appareil." },
  { icon: Cpu, title: "Rendu sur votre GPU", body: "three.js et WebGL, directement dans le navigateur." },
  { icon: Code2, title: "Licence MIT", body: "Lisez le code, apprenez-en, réutilisez-le librement." },
];

export function OpenSource() {
  return (
    <section className="frame scroll-mt-24 pt-[var(--section)]" aria-labelledby="open-title" id="open-source">
      <Reveal className="panel relative grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-10 overflow-hidden rounded-[30px] p-12 max-tab:grid-cols-1 max-fold:p-7">
        <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_80%_at_0%_0%,#000,transparent)]" />
        <div className="relative">
          <p className="eyebrow">Code ouvert</p>
          <h2 id="open-title" className="heading-section mt-5 !text-[clamp(32px,4vw,54px)]">
            Fait à la main, <span className="serif-accent">ouvert</span> à tous.
          </h2>
          <p className="text-lead mt-6 max-w-[44ch] !text-[17px]">
            SolidWave est conçu et développé par{" "}
            <a
              href={site.author.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring rounded font-medium text-ink underline decoration-accent/40 decoration-2 underline-offset-4 transition-[text-decoration-color,color] duration-200 hover:text-accent hover:decoration-accent [--ring-offset:2px]"
            >
              {site.author.name}
            </a>
            . Tout le code est public sur GitHub.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={site.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring group press inline-flex h-12 items-center gap-2.5 rounded-[14px] bg-primary px-5 text-[15px] font-medium text-primary-foreground [--press:.96] [--ring-offset:3px]"
            >
              <GithubIcon size={18} className="transition-transform duration-500 ease-spring group-hover:rotate-[-10deg] group-hover:scale-110" />
              Voir sur GitHub
              <ArrowUpRight size={15} strokeWidth={2} className="transition-transform duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
        <ul className="relative grid content-center gap-3">
          {points.map((point, index) => {
            const Icon = point.icon;
            return (
              <Reveal
                as="li"
                key={point.title}
                delay={120 + index * 90}
                className="group flex items-start gap-4 rounded-[18px] bg-surface p-4 shadow-raise transition-[translate,box-shadow] duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-float"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent transition-transform duration-500 ease-spring group-hover:rotate-[-6deg] group-hover:scale-110">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold tracking-[-0.01em]">{point.title}</span>
                  <span className="mt-0.5 block text-[14px] leading-[1.5] text-ink-3">{point.body}</span>
                </span>
              </Reveal>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
}
