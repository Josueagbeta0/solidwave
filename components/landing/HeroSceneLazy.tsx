"use client";

import dynamic from "next/dynamic";

/**
 * three.js is the heaviest part of the page. Loading the hero scene after the
 * first paint keeps the headline and buttons instant; the stage fades in once
 * the 3D bundle arrives.
 */
export const HeroSceneLazy = dynamic(
  () => import("@/components/landing/HeroScene").then((module) => module.HeroScene),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center">
        <span className="size-2 animate-pulse rounded-full bg-ink/20" />
      </div>
    ),
  },
);
