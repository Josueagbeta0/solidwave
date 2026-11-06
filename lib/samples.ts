import { LOGO_PATHS, LOGO_VIEWBOX } from "@/components/LogoMark";

/**
 * Built-in starter shapes. All original artwork (no third-party logos), so the
 * studio and the landing page can show them freely.
 */
export type SampleId =
  | "solidwave"
  | "spark"
  | "heart"
  | "bolt"
  | "bubble"
  | "leaf"
  | "ring"
  | "gem"
  | "cloud";

export type Sample = {
  id: SampleId;
  name: string;
  color: string;
  viewBox: string;
  paths: string[];
  /** Default finish id from lib/studio/materials.ts */
  finish: string;
};

export const samples: Sample[] = [
  {
    id: "solidwave",
    name: "SolidWave",
    color: "#5b7cff",
    viewBox: LOGO_VIEWBOX,
    finish: "holo",
    paths: LOGO_PATHS,
  },
  {
    id: "spark",
    name: "Étincelle",
    color: "#39e1ff",
    viewBox: "0 0 24 24",
    finish: "clear",
    paths: ["M12 1C12.9 7.6 16.4 11.1 23 12C16.4 12.9 12.9 16.4 12 23C11.1 16.4 7.6 12.9 1 12C7.6 11.1 11.1 7.6 12 1Z"],
  },
  {
    id: "heart",
    name: "Cœur",
    color: "#ff5c8a",
    viewBox: "0 0 24 24",
    finish: "rose",
    paths: [
      "M12 21.2 10.6 19.9C5.4 15.2 2 12.1 2 8.3 2 5.2 4.4 2.8 7.5 2.8c1.7 0 3.4.8 4.5 2.1 1.1-1.3 2.8-2.1 4.5-2.1 3.1 0 5.5 2.4 5.5 5.5 0 3.8-3.4 6.9-8.6 11.6L12 21.2Z",
    ],
  },
  {
    id: "bolt",
    name: "Éclair",
    color: "#ffc53d",
    viewBox: "0 0 24 24",
    finish: "gold",
    paths: ["M13.5 1.5 4 13.5h6.5L9.5 22.5 20 9.5h-6.6l.1-8Z"],
  },
  {
    id: "bubble",
    name: "Bulle",
    color: "#9b5cff",
    viewBox: "0 0 24 24",
    finish: "milk",
    paths: [
      "M12 3C6.5 3 2 6.9 2 11.6c0 2.6 1.4 4.9 3.6 6.5L4.8 21.6c-.1.4.3.7.7.5l4.1-2.2c.8.2 1.6.3 2.4.3 5.5 0 10-3.9 10-8.6S17.5 3 12 3Z",
    ],
  },
  {
    id: "leaf",
    name: "Feuille",
    color: "#2fd38a",
    viewBox: "0 0 24 24",
    finish: "emerald",
    paths: [
      "M20.5 3.5C11 3.5 4.5 8.5 4.5 15.4c0 1.5.4 2.9 1 4.1L3.3 21.7l1.1 1.1 2.2-2.2c1.2.7 2.6 1 4.1 1C17.6 21.6 20.5 13 20.5 3.5Z",
    ],
  },
  {
    id: "ring",
    name: "Anneau",
    color: "#c9ced8",
    viewBox: "0 0 24 24",
    finish: "chrome",
    paths: ["M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20Zm0 5a5 5 0 1 1 0 10 5 5 0 1 1 0-10Z"],
  },
  {
    id: "gem",
    name: "Gemme",
    color: "#3d7bff",
    viewBox: "0 0 24 24",
    finish: "sapphire",
    paths: ["M6 3h12l4 6-10 12L2 9l4-6Z"],
  },
  {
    id: "cloud",
    name: "Nuage",
    color: "#e6ecf5",
    viewBox: "0 0 24 24",
    finish: "frosted",
    paths: ["M7 19a5 5 0 0 1-.6-10A6.5 6.5 0 0 1 18.8 10 4.5 4.5 0 0 1 18 19H7Z"],
  },
];

export const sampleById = (id: string) =>
  samples.find((sample) => sample.id === id) ?? samples[0];

export function sampleSvg(sample: Sample): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sample.viewBox}" fill="${sample.color}">${sample.paths
    .map((d) => `<path d="${d}"/>`)
    .join("")}</svg>`;
}
