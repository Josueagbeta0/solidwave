import { Reveal } from "@/components/motion";

const faqs = [
  {
    q: "Faut-il connaître un logiciel 3D ?",
    a: "Pas du tout. Importez un fichier, choisissez un volume et une finition : le studio s’occupe de la géométrie, de l’éclairage et du rendu. Chaque réglage a une valeur par défaut sensée et une explication d’une ligne.",
  },
  {
    q: "Quels fichiers puis-je importer ?",
    a: "Le SVG donne le résultat le plus fidèle, car ses tracés sont utilisés directement. Les PNG, JPG et WebP sont vectorisés automatiquement ; un logo à la silhouette nette sur fond uni ou transparent donne les meilleurs résultats.",
  },
  {
    q: "Mes fichiers sont-ils envoyés quelque part ?",
    a: "Les logos et le mode photo « Rapide » restent entièrement dans votre navigateur : rien n’est envoyé. Seul le mode photo « IA 360° » envoie votre photo, le temps de la génération, aux démos publiques des modèles ouverts TRELLIS hébergées par Hugging Face, via votre propre compte gratuit.",
  },
  {
    q: "Puis-je partir d’une photo plutôt que d’un logo ?",
    a: "Oui, c’est la nouveauté de la version 2.0. Importez la photo d’un objet (vêtement, voiture, animal…) : le mode Rapide en fait un relief sur votre appareil, sans limite ; le mode IA 360° génère l’objet complet, visible sous tous les angles, en une à deux minutes, avec quelques essais gratuits par jour.",
  },
  {
    q: "Quelle taille pour les rendus PNG ?",
    a: "Jusqu’à 4096 × 4096 pixels. Les petites tailles sont suréchantillonnées pour des bords impeccables. La 4K demande une carte graphique assez récente ; si elle échoue, la 2K fonctionne toujours.",
  },
  {
    q: "Puis-je exporter une animation ?",
    a: "Oui. Enregistrez une boucle 360° parfaitement fluide, en carré, vertical ou paysage, avec votre fond et votre éclairage. La vidéo est encodée image par image en MP4, à 60 images par seconde.",
  },
  {
    q: "Que sont les ambiances ?",
    a: "Des directions artistiques complètes appliquées en un clic : finition, éclairage, fond, sol et effets réglés ensemble. Chaque réglage reste modifiable ensuite.",
  },
  {
    q: "Puis-je imprimer le résultat en 3D ?",
    a: "Oui. Les exports STL sont des maillages fermés, en millimètres, aux dimensions que vous avez réglées dans le studio.",
  },
  {
    q: "Puis-je garder les couleurs de mon logo ?",
    a: "Oui. Dans l’onglet Matière, activez « Couleurs du logo » : le dessin de votre fichier, dégradés et détails compris, est reproduit sur l’objet, et la finition choisie sert de vernis.",
  },
  {
    q: "Le code est-il ouvert ?",
    a: "Oui, sous licence MIT. SolidWave est conçu et développé par Josué Agbeta ; le code complet est sur GitHub.",
  },
  {
    q: "Puis-je utiliser les rendus à des fins commerciales ?",
    a: "Vos rendus vous appartiennent. Assurez-vous simplement d’avoir les droits sur le logo ou le visuel que vous importez.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="frame scroll-mt-24 pt-[var(--section)]" aria-labelledby="faq-title">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-12 max-tab:grid-cols-1">
        <Reveal>
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-title" className="heading-section mt-5">
            Bonnes questions, réponses <span className="serif-accent">claires.</span>
          </h2>
        </Reveal>
        <Reveal delay={100} className="divide-y divide-hairline border-y border-hairline">
          {faqs.map((item) => (
            <details key={item.q} className="faq-item group py-1">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-6 rounded-lg py-5 text-[17px] font-medium tracking-[-0.015em] text-ink transition-colors duration-200 hover:text-accent [--ring-offset:2px] [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden="true"
                  className="relative grid size-7 shrink-0 place-items-center rounded-full bg-well-strong transition-[rotate,background-color,color] duration-300 ease-spring group-open:rotate-45 group-open:bg-accent group-open:[&>span]:bg-white"
                >
                  <span className="absolute h-px w-3 bg-ink-2" />
                  <span className="absolute h-3 w-px bg-ink-2" />
                </span>
              </summary>
              <p className="max-w-[62ch] pb-5 text-[15px] leading-[1.65] text-ink-3">{item.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
