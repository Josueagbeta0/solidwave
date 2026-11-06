import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Trace any logo, give it depth and a finish, then render a 4K PNG or export GLB and STL. Runs entirely in your browser.",
};

export default function StudioPage() {
  return <Studio />;
}
