"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/LogoMark";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#finishes", label: "Finishes" },
  { href: "#render", label: "Render" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
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

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled || open
          ? "border-hairline bg-shell/75 backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <a
        href="#main-content"
        className="focus-ring absolute -top-20 left-3 rounded-full bg-primary px-4 py-2 text-[14px] font-medium text-primary-foreground focus:top-3"
      >
        Skip to content
      </a>
      <nav className="frame flex h-16 items-center justify-between gap-6" aria-label="Main">
        <Link
          href="/"
          aria-label="SolidWave home"
          className="focus-ring group flex items-center gap-2.5 rounded-lg [--ring-offset:4px]"
        >
          <LogoMark
            size={28}
            gradient
            className="transition-transform duration-500 ease-spring group-hover:-rotate-6"
          />
          <Wordmark className="text-[18px]" />
        </Link>

        <div className="flex items-center gap-1 max-mid:hidden">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="focus-ring rounded-full px-3.5 py-2 text-[14px] text-ink-3 transition-colors hover:text-ink [--ring-offset:2px]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/studio"
            className="focus-ring group/cta inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-foreground press [--press:.96] [--ring-offset:3px]"
          >
            Open studio
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
            aria-label={open ? "Close menu" : "Open menu"}
            className="focus-ring hidden size-10 place-items-center rounded-full bg-well-strong text-ink [--ring-offset:2px] max-mid:grid"
          >
            {open ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-nav" className="frame hidden pb-4 max-mid:block">
          <nav aria-label="Mobile" className="flex flex-col border-t border-hairline pt-2">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-xl px-2 text-[16px] text-ink-2 hover:bg-well hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
