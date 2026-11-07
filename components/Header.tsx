"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/LogoMark";
import { usePresence } from "@/components/usePresence";

const links = [
  { href: "#how", label: "Fonctionnement" },
  { href: "#finishes", label: "Finitions" },
  { href: "#features", label: "Le studio" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const floating = scrolled || open;
  const menu = usePresence(open, 160);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 pt-3 max-fold:pt-2">
      <a
        href="#main-content"
        className="focus-ring pointer-events-auto absolute -top-20 left-3 rounded-full bg-primary px-4 py-2 text-[14px] font-medium text-primary-foreground focus:top-3"
      >
        Aller au contenu
      </a>
      {/* The bar condenses into a floating capsule once the page scrolls. */}
      <div
        className={`pointer-events-auto mx-auto transition-[max-width,background-color,box-shadow,padding] duration-500 ease-out ${
          floating
            ? "glass max-w-[880px] rounded-[22px] px-2"
            : "max-w-[1232px] rounded-[22px] bg-transparent px-4"
        } w-[calc(100%-24px)]`}
      >
        <nav className="flex h-14 items-center justify-between gap-6" aria-label="Principale">
          <Link
            href="/"
            aria-label="Accueil SolidWave"
            className="focus-ring group flex items-center gap-2 rounded-lg pl-1.5 [--ring-offset:4px]"
          >
            <LogoMark
              size={26}
              gradient
              className="transition-transform duration-500 ease-spring group-hover:-rotate-6"
            />
            <Wordmark className="text-[17px]" />
          </Link>

          <div className="flex items-center gap-0.5 max-mid:hidden">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="focus-ring relative isolate rounded-full px-3.5 py-2 text-[14px] text-ink-3 transition-colors duration-200 before:absolute before:inset-0 before:-z-10 before:scale-90 before:rounded-full before:bg-well-strong before:opacity-0 before:transition-[opacity,scale] before:duration-300 before:ease-spring hover:text-ink hover:before:scale-100 hover:before:opacity-100 [--ring-offset:2px]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/studio"
              className="focus-ring group/cta inline-flex h-10 items-center gap-1.5 rounded-[14px] bg-primary px-4 text-[14px] font-medium text-primary-foreground press [--press:.96] [--ring-offset:3px]"
            >
              Ouvrir le studio
              <ArrowRight
                size={15}
                strokeWidth={2}
                className="transition-transform duration-300 ease-spring group-hover/cta:translate-x-0.5"
              />
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              className="focus-ring press relative hidden size-10 place-items-center rounded-[14px] bg-well-strong text-ink [--press:.92] [--ring-offset:2px] max-mid:grid"
            >
              {/* Both icons stay mounted and cross-rotate. */}
              <Menu
                size={18}
                strokeWidth={1.8}
                className={`absolute transition-[opacity,rotate,scale] duration-300 ease-spring ${open ? "rotate-90 scale-50 opacity-0" : ""}`}
              />
              <X
                size={18}
                strokeWidth={1.8}
                className={`absolute transition-[opacity,rotate,scale] duration-300 ease-spring ${open ? "" : "-rotate-90 scale-50 opacity-0"}`}
              />
            </button>
          </div>
        </nav>

        {menu.mounted && (
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className={`stagger-links hidden flex-col border-t border-hairline pb-2 pt-1 max-mid:flex ${menu.leaving ? "animate-pop-out" : ""}`}
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-xl px-3 text-[16px] text-ink-2 transition-[background-color,color,translate] duration-200 hover:translate-x-1 hover:bg-well hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
