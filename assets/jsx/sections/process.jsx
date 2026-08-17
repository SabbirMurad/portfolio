/* global React, gsap, ScrollTrigger, SplitHeading, process */
/* Sticky card stack — each step pins, then the next slides over it while the
   buried card shrinks and dims. Scrubbed to the section scroll. */
function Process() {
  const { useRef, useEffect } = React;
  const ref = useRef(null);
  const total = process.length;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cards = el.querySelectorAll("[data-proc-card]");
    const veils = el.querySelectorAll("[data-proc-veil]");

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: true },
      });
      for (let i = 0; i < total - 1; i++) {
        const start = i / total;
        const dur = 1 / total;
        tl.fromTo(cards[i], { scale: 1 }, { scale: 0.9, ease: "none", duration: dur }, start);
        if (veils[i])
          tl.fromTo(veils[i], { opacity: 0 }, { opacity: 0.72, ease: "none", duration: dur }, start);
      }
      // Pin the timeline length to the full scroll so slices map 1:1.
      tl.to({}, { duration: 0 }, 1);
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section data-cursor-theme="dark" className="bg-ink py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <SplitHeading
          as="h2"
          text="A process that makes the outcome predictable"
          className="display text-display-lg max-w-[15ch]"
          ink="#ffffff"
          muted="rgba(255,255,255,0.22)"
        />

        <div ref={ref} className="mt-16">
          {process.map((s, i) => {
            const isLast = i === total - 1;
            return (
              <div
                key={s.num}
                className="sticky flex justify-center"
                style={{ top: `calc(16vh + ${i * 18}px)`, marginBottom: isLast ? 0 : "26vh" }}
              >
                <div
                  data-proc-card
                  className="relative w-full overflow-hidden rounded-md border border-line-dark bg-ink-2 p-8 sm:p-12"
                  style={{ zIndex: i }}
                >
                  {!isLast && (
                    <div
                      data-proc-veil
                      className="pointer-events-none absolute inset-0 z-10 bg-ink"
                      style={{ opacity: 0 }}
                    />
                  )}
                  <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:gap-16">
                    <span className="display text-6xl text-vermilion sm:text-7xl">{s.num}</span>
                    <div>
                      <h3 className="display text-display-sm text-white">{s.title}</h3>
                      <p className="mt-4 max-w-xl text-[15px] leading-[1.75] text-white/55">
                        {s.body}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
