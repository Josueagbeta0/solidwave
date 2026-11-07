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

/** A slow marquee of uses; pauses on hover, stops for reduced motion. */
export function UseCases() {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-10 pr-10">
      {uses.map((use) => (
        <li key={use} className="flex items-center gap-10 whitespace-nowrap text-[17px] tracking-[-0.01em] text-ink-3">
          {use}
          <span aria-hidden="true" className="size-1.5 rotate-45 bg-accent/50" />
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Usages" className="pt-24 max-tab:pt-16">
      <p className="eyebrow text-center">Conçu pour</p>
      <div className="marquee mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <div className="marquee-track flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}
