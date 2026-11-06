import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/LogoMark";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/studio", label: "Studio" },
      { href: "/#finishes", label: "Finishes" },
      { href: "/#render", label: "Render engine" },
      { href: "/#formats", label: "Export formats" },
    ],
  },
  {
    title: "Start from",
    links: [
      { href: "/studio?sample=solidwave&finish=holo", label: "Holographic wave" },
      { href: "/studio?sample=bolt&finish=gold", label: "Gold bolt" },
      { href: "/studio?sample=heart&finish=rose", label: "Rose glass heart" },
      { href: "/studio?sample=ring&finish=chrome", label: "Chrome ring" },
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
            Flat logos in, solid objects out. Made for designers who want depth without opening a
            3D package.
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
        <span>© {new Date().getFullYear()} SolidWave. All rights reserved.</span>
        <span className="font-mono">Rendered in your browser · No uploads</span>
      </div>
      <div aria-hidden="true" className="bg-wave h-[3px] w-full opacity-80" />
    </footer>
  );
}
