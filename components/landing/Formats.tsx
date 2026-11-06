import { Reveal } from "@/components/motion";

const formats = [
  {
    ext: "PNG",
    color: "text-ink",
    title: "Pour les écrans",
    points: ["Carré en 1K, 2K ou 4K", "Fond transparent ou intégré", "Effets de lumière inclus"],
  },
  {
    ext: "MP4",
    color: "text-ink",
    title: "Pour les réseaux",
    points: ["Boucle 360° sans coupure", "1:1, 9:16 ou 16:9", "Fond et éclairage inclus"],
  },
  {
    ext: "GLB",
    color: "text-ink",
    title: "Pour le web et la RA",
    points: ["glTF 2.0 binaire", "Dimensions en mètres", "S’ouvre dans three.js, Spline, Blender"],
  },
  {
    ext: "STL",
    color: "text-ink",
    title: "Pour l’impression",
    points: ["Maillage fermé et étanche", "Dimensions en millimètres", "Prêt pour tout trancheur"],
  },
];

export function Formats() {
  return (
    <section
      id="formats"
      className="frame scroll-mt-24 pt-[var(--section)]"
      aria-labelledby="formats-title"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-12 max-desk:grid-cols-1">
        <Reveal>
          <p className="eyebrow">Exports</p>
          <h2 id="formats-title" className="heading-section mt-5">
            Un modèle, <span className="serif-accent">quatre</span> sorties.
          </h2>
          <p className="text-lead mt-6 max-w-[40ch]">
            Ce que vous voyez à l’écran est exactement ce que vous obtenez, que l’objet finisse sur
            un site web, dans une scène 3D ou sur un plateau d’impression.
          </p>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 max-fold:grid-cols-1">
          {formats.map((format, index) => (
            <Reveal
              as="article"
              key={format.ext}
              delay={index * 70}
              className="panel flex flex-col rounded-[22px] p-6 transition-shadow duration-300 hover:shadow-float"
            >
              <span className={`font-mono text-[30px] font-medium tracking-[-0.04em] ${format.color}`}>
                <span className="text-accent">.</span>
                {format.ext.toLowerCase()}
              </span>
              <h3 className="mt-6 text-[16px] font-semibold">{format.title}</h3>
              <ul className="mt-3 space-y-2 text-[14px] leading-[1.45] text-ink-3">
                {format.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-4" />
                    {point}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
