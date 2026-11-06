import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";

export function Cta() {
  return (
    <section className="frame pb-[var(--section)] pt-[var(--section)]" aria-labelledby="cta-title">
      <div className="relative isolate overflow-hidden rounded-[32px] px-10 py-20 text-center max-fold:px-6 max-fold:py-14">
        <div aria-hidden="true" className="wave-flow absolute inset-0 -z-20 opacity-90" />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(70%_80%_at_50%_0%,transparent,#06070cd9_80%)]"
        />
        <div aria-hidden="true" className="grain absolute inset-0 -z-10 opacity-[0.08] mix-blend-overlay" />
        <LogoMark size={56} className="mx-auto text-white drop-shadow-[0_8px_24px_rgba(0,0,0,.4)]" />
        <h2
          id="cta-title"
          className="heading-section mx-auto mt-8 max-w-[18ch] text-white"
        >
          Your logo deserves a little weight.
        </h2>
        <p className="mx-auto mt-5 max-w-[44ch] text-[17px] leading-[1.6] text-white/75">
          Open the studio, drop a file and have a render you&apos;re proud of in under a minute.
        </p>
        <Link
          href="/studio"
          className="focus-ring group mt-9 inline-flex h-13 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-[#06070c] shadow-[0_18px_40px_-16px_rgba(0,0,0,.6)] press [--press:.96] [--ring-offset:4px]"
        >
          Open the studio
          <ArrowRight
            size={16}
            strokeWidth={2.2}
            className="transition-transform duration-300 ease-spring group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </section>
  );
}
