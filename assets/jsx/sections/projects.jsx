/* global React, Parallax, Reveal, RevealLayer, SplitHeading, projects */
function Projects() {
  return (
    <section id="work" className="bg-bone py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <SplitHeading as="h2" text="My projects." className="display text-display-lg" />
          </div>

          <Reveal from="right" delay={0.1}>
            <p className="max-w-sm text-[14px] leading-[1.75] text-muted-2">
              A selection of work spanning systems programming, mobile apps, and the web — each
              built end to end, from architecture through interface.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2">
          {projects.map((p, i) => (
            <Reveal
              key={p.name}
              from={i % 2 === 0 ? "left" : "right"}
              delay={(i % 2) * 0.08}
              scaleFrom={1}
              rotate={1.4}
            >
              <a
                href={p.href}
                target="_blank"
                rel="noreferrer"
                data-cursor="view"
                data-cursor-label="VIEW"
                className="group block"
              >
                <RevealLayer scaleFrom={1.14} distance={0} className="overflow-hidden rounded-sm">
                  <div className="relative h-[200px] overflow-hidden sm:h-[240px] lg:h-[280px]">
                    {p.image ? (
                      /* A real banner sits still rather than parallaxing, so
                         nothing of the artwork slides out of frame. At the full
                         desktop card size the box and a 2.6:1 banner are the
                         same shape, so it fills exactly; narrower cards crop
                         from the right, which is why the anchor is `object-left`
                         — these banners carry their title bottom-left. */
                      <div className="absolute inset-0 bg-ink">
                        <img
                          src={p.image}
                          alt=""
                          decoding="async"
                          className="h-full w-full object-cover object-left transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <React.Fragment>
                        <Parallax amount={22} className="absolute inset-x-0 -inset-y-[14%]">
                          <div
                            className="h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                            style={{
                              background: `linear-gradient(145deg, ${p.accent}, ${p.accent}bb 45%, #0b0b0b)`,
                            }}
                          />
                        </Parallax>

                        {/* The oversized name is the stand-in for cards with no
                            banner of their own. */}
                        <Parallax
                          amount={-14}
                          className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        >
                          <span className="display text-[clamp(2rem,4.5vw,3.75rem)] leading-none text-white/20">
                            {p.name}
                          </span>
                        </Parallax>
                      </React.Fragment>
                    )}

                    {p.image ? null : (
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                    )}
                  </div>
                </RevealLayer>

                <RevealLayer delay={0.12} distance={26}>
                  <div className="mt-4 flex items-baseline justify-between gap-4 border-b border-line pb-3">
                    <span className="display-tight flex items-center gap-2.5 text-xl font-bold">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ background: p.accent }}
                      />
                      {p.name}
                      <span className="meta font-normal text-muted-2">/{p.kind}</span>
                    </span>
                    <span className="meta shrink-0 text-muted">{p.year}</span>
                  </div>
                </RevealLayer>

                <RevealLayer delay={0.22} distance={22}>
                  <p className="mt-3 line-clamp-2 max-w-md text-[13.5px] leading-[1.65] text-muted-2">
                    {p.blurb}
                  </p>
                </RevealLayer>

                <RevealLayer delay={0.32} distance={18}>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="meta rounded-full border border-line px-2.5 py-1 text-ink/60"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </RevealLayer>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
