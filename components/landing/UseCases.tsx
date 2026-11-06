import { Reveal } from "@/components/motion";

const uses = [
  "Icônes d’app",
  "Pages d’accueil",
  "Chartes graphiques",
  "Présentations",
  "Réseaux sociaux",
  "Maquettes produit",
  "Badges d’événement",
  "Impressions 3D",
];

export function UseCases() {
  return (
    <section aria-label="Usages" className="frame pt-20 max-tab:pt-14">
      <Reveal className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-center">
        <span className="eyebrow mr-3 max-fold:w-full max-fold:mr-0">Conçu pour</span>
        {uses.map((use, index) => (
          <span key={use} className="flex items-center gap-2 text-[15px] text-ink-3">
            {use}
            {index < uses.length - 1 && (
              <span aria-hidden="true" className="size-1 rounded-full bg-hairline-strong" />
            )}
          </span>
        ))}
      </Reveal>
    </section>
  );
}
