"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion";
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
      <Reveal className="flex flex-col items-center text-center">
        <p className="eyebrow">Finish library</p>
        <h2 id="finishes-title" className="heading-section mt-5 max-w-[16ch]">
          {finishes.length} finishes, all <span className="serif-accent">physically</span> based.
        </h2>
        <div
          role="tablist"
          aria-label="Finish family"
          className="mt-10 flex rounded-[14px] bg-well-strong p-1"
        >
          {groups.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={group === item.id}
              onClick={() => setGroup(item.id)}
              className={`focus-ring rounded-[11px] px-5 py-2 text-[14px] font-medium transition-[background-color,color,box-shadow] duration-200 [--ring-offset:2px] max-phone:px-3.5 ${
                group === item.id ? "bg-surface text-ink shadow-raise" : "text-ink-3 hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p key={current.id} className="text-lead animate-rise mt-6 max-w-[48ch] !text-[17px]">
          {current.blurb}
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-6 gap-3 max-desk:grid-cols-4 max-fold:grid-cols-3">
        {list.map((finish, index) => (
          <Link
            key={`${group}-${finish.id}`}
            href={`/studio?sample=solidwave&finish=${finish.id}`}
            style={{ animationDelay: `${index * 40}ms` }}
            className="panel focus-ring group animate-rise relative flex flex-col items-center gap-4 rounded-[20px] px-3 pb-5 pt-7 transition-[transform,box-shadow] duration-500 ease-spring hover:-translate-y-1 hover:shadow-float [--ring-offset:3px]"
          >
            <span
              aria-hidden="true"
              className="block size-[78px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.06),0_14px_24px_-12px_rgba(12,10,9,.45)] transition-transform duration-500 ease-spring group-hover:scale-105 max-fold:size-16"
              style={{ background: finish.swatch }}
            />
            <span className="text-[13.5px] font-medium text-ink-2">{finish.name}</span>
            <ArrowUpRight
              size={14}
              strokeWidth={1.8}
              className="absolute right-3 top-3 text-ink-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
