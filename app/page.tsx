import { connection } from "next/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SmoothScroll } from "@/components/motion";
import { Hero } from "@/components/landing/Hero";
import { UseCases } from "@/components/landing/UseCases";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Finishes } from "@/components/landing/Finishes";
import { Features } from "@/components/landing/Features";
import { Formats } from "@/components/landing/Formats";
import { OpenSource } from "@/components/landing/OpenSource";
import { Faq } from "@/components/landing/Faq";
import { Cta } from "@/components/landing/Cta";

export default async function HomePage() {
  // Rendered per request so Next can stamp the CSP nonce on its scripts (see proxy.ts).
  await connection();
  return (
    <>
      <SmoothScroll />
      <Header />
      <main id="main-content" className="relative overflow-clip bg-shell text-ink">
        <Hero />
        <UseCases />
        <HowItWorks />
        <Features />
        <Finishes />
        <Formats />
        <OpenSource />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
