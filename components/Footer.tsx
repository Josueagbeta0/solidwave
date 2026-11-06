import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/LogoMark";

const columns = [
  {
    title: "Produit",
    links: [
      { href: "/studio", label: "Studio" },
      { href: "/#finishes", label: "Finitions" },
      { href: "/#features", label: "Fonctionnalités" },
      { href: "/#formats", label: "Formats d’export" },
    ],
  },
  {
    title: "Partir de",
    links: [
      { href: "/studio?sample=solidwave&finish=chrome", label: "Vague chromée" },
      { href: "/studio?sample=bolt&finish=gold", label: "Éclair doré" },
      { href: "/studio?sample=heart&finish=rose", label: "Cœur en verre rosé" },
      { href: "/studio?sample=ring&finish=chrome", label: "Anneau chromé" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-hairline bg-shell">
      <div className="frame grid grid-cols-[1.4fr_1fr_1fr] gap-12 py-16 max-tab:grid-cols-2 max-fold:grid-cols-1">
        <div className="max-tab:col-span-2 max-fold:col-span-1">
          <Link href="/" className="focus-ring inline-flex items-center gap-2.5 rounded-lg [--ring-offset:4px]">
            <LogoMark size={28} gradient />
            <Wordmark className="text-[18px]" />
          </Link>
          <p className="mt-4 max-w-[34ch] text-[14px] leading-[1.6] text-ink-3">
            Des logos plats en entrée, des objets en volume en sortie. Pour les designers qui veulent
            du relief sans ouvrir un logiciel 3D.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="eyebrow">{column.title}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="focus-ring rounded text-[14px] text-ink-2 transition-colors hover:text-ink [--ring-offset:3px]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="frame flex flex-wrap items-center justify-between gap-3 border-t border-hairline py-6 text-[12.5px] text-ink-4">
        <span>© {new Date().getFullYear()} SolidWave. Tous droits réservés.</span>
        <span className="font-mono">Rendu dans votre navigateur · Aucun envoi</span>
      </div>
      {/* Oversized wordmark that bleeds off the bottom edge. */}
      <div aria-hidden="true" className="frame -mb-[0.22em] select-none overflow-hidden">
        <p className="text-center text-[clamp(64px,17vw,236px)] font-semibold leading-none tracking-[-0.07em] text-ink/[0.05]">
          SolidWave
        </p>
      </div>
    </footer>
  );
}
