import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/landing/Hero";
import { UseCases } from "@/components/landing/UseCases";
import { Steps } from "@/components/landing/Steps";
import { Finishes } from "@/components/landing/Finishes";
import { RenderFeatures } from "@/components/landing/RenderFeatures";
import { Formats } from "@/components/landing/Formats";
import { Faq } from "@/components/landing/Faq";
import { Cta } from "@/components/landing/Cta";

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main-content" className="relative overflow-clip bg-shell text-ink">
        <Hero />
        <UseCases />
        <Steps />
        <Finishes />
        <RenderFeatures />
        <Formats />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
