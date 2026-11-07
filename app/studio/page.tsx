import type { Metadata } from "next";
import { connection } from "next/server";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Vectorisez n’importe quel logo, donnez-lui du volume et une finition, puis générez un PNG en 4K, une vidéo 360° ou des fichiers GLB et STL. Tout tourne dans votre navigateur.",
};

export default async function StudioPage() {
  // Rendered per request so Next can stamp the CSP nonce on its scripts (see proxy.ts).
  await connection();
  return <Studio />;
}
