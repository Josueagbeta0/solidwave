"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { finishes, type FinishGroup } from "@/lib/studio/materials";

const groups: { id: FinishGroup; label: string; blurb: string }[] = [
  { id: "glass", label: "Glass", blurb: "Real refraction and tinted depth, from crystal to smoked obsidian." },
  { id: "liquid", label: "Liquid", blurb: "Dispersive glass that splits light into a spectrum at every edge." },
  { id: "metal", label: "Metal", blurb: "Polished, brushed and anodised metals with physically based reflections." },
  { id: "color", label: "Colour", blurb: "Any colour you like, with full control over gloss and metalness." },
];

export function Finishes() {
  const [group, setGroup] = useState<FinishGroup>("glass");
  const current = groups.find((item) => item.id === group) ?? groups[0];
  const list = finishes.filter((finish) => finish.group === group);

  return (
    <section
      id="finishes"
      className="frame scroll-mt-24 pt-[var(--section)]"
      aria-labelledby="finishes-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div className="max-w-[620px]">
          <p className="eyebrow">Finish library</p>
          <h2 id="finishes-title" className="heading-section mt-4">
            {finishes.length} finishes, each one physically based.
          </h2>
        </div>
        <div
          role="tablist"
          aria-label="Finish family"
          className="flex rounded-full bg-well p-1 shadow-[inset_0_0_0_1px_var(--color-hairline)]"
        >
          {groups.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={group === item.id}
              onClick={() => setGroup(item.id)}
              className={`focus-ring rounded-full px-4 py-2 text-[14px] font-medium transition-colors [--ring-offset:2px] ${
                group === item.id ? "bg-raised text-ink shadow-raise" : "text-ink-3 hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-lead mt-6 max-w-[54ch]">{current.blurb}</p>

      <div className="mt-10 grid grid-cols-6 gap-3 max-desk:grid-cols-4 max-fold:grid-cols-3">
        {list.map((finish) => (
          <Link
            key={finish.id}
            href={`/studio?sample=solidwave&finish=${finish.id}`}
            className="panel focus-ring group relative flex flex-col items-center gap-4 rounded-[20px] px-3 pb-4 pt-6 transition-transform duration-500 ease-spring hover:-translate-y-1 [--ring-offset:3px]"
          >
            <span
              aria-hidden="true"
              className="block size-[84px] rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,.12),0_18px_30px_-14px_rgba(0,0,0,.9)] transition-transform duration-500 ease-spring group-hover:scale-105 max-fold:size-16"
              style={{ background: finish.swatch }}
            />
            <span className="text-[13.5px] font-medium text-ink-2">{finish.name}</span>
            <ArrowUpRight
              size={14}
              strokeWidth={1.8}
              className="absolute right-3 top-3 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
