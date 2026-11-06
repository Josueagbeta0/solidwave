import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SmoothScroll } from "@/components/motion";
import { Hero } from "@/components/landing/Hero";
import { UseCases } from "@/components/landing/UseCases";
import { Steps } from "@/components/landing/Steps";
import { Finishes } from "@/components/landing/Finishes";
import { Features } from "@/components/landing/Features";
import { Formats } from "@/components/landing/Formats";
import { Faq } from "@/components/landing/Faq";
import { Cta } from "@/components/landing/Cta";

export default function HomePage() {
  return (
    <>
      <SmoothScroll />
      <Header />
      <main id="main-content" className="relative overflow-clip bg-shell text-ink">
        <Hero />
        <UseCases />
        <Steps />
        <Features />
        <Finishes />
        <Formats />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
