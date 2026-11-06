import { Reveal } from "@/components/motion";

const uses = [
  "App icons",
  "Landing page heroes",
  "Brand guidelines",
  "Pitch decks",
  "Social posts",
  "Product mockups",
  "Event badges",
  "3D prints",
];

export function UseCases() {
  return (
    <section aria-label="Use cases" className="frame pt-20 max-tab:pt-14">
      <Reveal className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-center">
        <span className="eyebrow mr-3 max-fold:w-full max-fold:mr-0">Made for</span>
        {uses.map((use, index) => (
          <span key={use} className="flex items-center gap-2 text-[15px] text-ink-3">
            {use}
            {index < uses.length - 1 && (
              <span aria-hidden="true" className="size-1 rounded-full bg-hairline-strong" />
            )}
          </span>
        ))}
      </Reveal>
    </section>
  );
}
