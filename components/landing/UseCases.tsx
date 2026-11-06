const uses = [
  "App icons",
  "Landing page heroes",
  "Pitch decks",
  "Social posts",
  "Product mockups",
  "Event badges",
  "3D printing",
  "AR & WebGL scenes",
  "Merch prototypes",
  "Brand guidelines",
];

export function UseCases() {
  const row = [...uses, ...uses];
  return (
    <section aria-label="Made for" className="relative mt-20 border-y border-hairline py-5">
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <ul className="flex w-max animate-[marquee_38s_linear_infinite] gap-10 motion-reduce:animate-none">
          {row.map((use, index) => (
            <li
              key={`${use}-${index}`}
              aria-hidden={index >= uses.length}
              className="flex items-center gap-10 whitespace-nowrap font-display text-[18px] font-medium tracking-[-0.02em] text-ink-3"
            >
              {use}
              <span className="bg-wave size-1.5 rounded-full" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
