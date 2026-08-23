/* global React, Reveal, RevealLayer, SplitHeading, docs */
function Docs() {
  return (
    <section id="docs" className="bg-paper py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <SplitHeading
              as="h2"
              text="Documentation I write"
              className="display text-display-lg max-w-[11ch]"
            />
          </div>

          <Reveal from="right" delay={0.1} className="flex flex-col items-end gap-4">
            <p className="max-w-sm text-[14px] leading-[1.75] text-muted-2">
              Reference material, architecture notes and guides — written to be read by whoever
              picks the project up next.
            </p>
            <a
              href="/documentations"
              data-cursor="view"
              data-cursor-label="DOCS"
              className="group inline-flex items-center gap-3 rounded-sm bg-ink px-6 py-3.5 text-white transition-colors duration-400 hover:bg-vermilion"
            >
              <span className="meta">View all documentation</span>
              <span className="inline-block transition-transform duration-400 group-hover:translate-x-1">
                →
              </span>
            </a>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d, i) => (
            <Reveal
              key={d.title}
              delay={(i % 3) * 0.09}
              scaleFrom={0.97}
              distance={40}
              className="h-full"
            >
              <a
                href={d.href}
                target="_blank"
                rel="noreferrer"
                data-cursor="view"
                data-cursor-label="READ"
                className="group flex h-full flex-col rounded-sm border border-line bg-bone p-6 transition-colors duration-500 hover:border-ink/25 sm:p-7"
              >
                <RevealLayer distance={20}>
                  <h3 className="display-tight text-xl font-bold leading-tight transition-colors duration-400 group-hover:text-vermilion">
                    {d.title}
                  </h3>
                </RevealLayer>

                <RevealLayer delay={0.08} distance={18}>
                  <p className="mt-3 text-[13.5px] leading-[1.7] text-muted-2">{d.blurb}</p>
                </RevealLayer>

                <RevealLayer delay={0.16} distance={14} className="mt-5 flex flex-wrap gap-1.5">
                  {d.tags.map((t) => (
                    <span
                      key={t}
                      className="meta rounded-full border border-line px-2.5 py-1 text-ink/60"
                    >
                      {t}
                    </span>
                  ))}
                </RevealLayer>

                <RevealLayer
                  delay={0.24}
                  distance={12}
                  className="mt-auto flex items-center justify-end gap-2 pt-7 text-muted-2 transition-colors duration-400 group-hover:text-vermilion"
                >
                  <span className="meta">View details</span>
                  <span className="transition-transform duration-400 group-hover:translate-x-1">→</span>
                </RevealLayer>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
