/* global React, Reveal, stack */
function Stack() {
  const row = [...stack, ...stack];
  return (
    <section className="border-b border-line bg-bone pt-10 pb-[calc(2.5rem+var(--section-overlap,0px))]">
      <Reveal className="mx-auto mb-8 max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <p className="meta text-muted-2">Daily drivers — the stack I build production work on</p>
      </Reveal>

      <Reveal delay={0.08} scaleFrom={1} className="marquee-paused relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-bone to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-bone to-transparent" />

        <div
          className="animate-marquee flex w-max items-center gap-14 pr-14"
          style={{ "--marquee-duration": "38s" }}
        >
          {row.map((s, i) => (
            <div
              key={s.name + "-" + i}
              className="flex shrink-0 items-center gap-3 opacity-55 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0"
            >
              <img src={s.icon} alt="" aria-hidden className="h-7 w-7 object-contain" />
              <span className="display-tight whitespace-nowrap text-xl font-semibold">{s.name}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
