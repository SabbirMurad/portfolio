/* global React, Reveal, RevealLayer, SplitHeading, services */
function Services() {
  const { useState } = React;
  const [open, setOpen] = useState(0);

  return (
    <section id="services" className="bg-paper py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <SplitHeading
          as="h2"
          text="Powerful engineering services for your product"
          className="display text-display-lg max-w-[14ch]"
        />

        <div className="mt-16 border-t border-line">
          {services.map((s, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={s.num} from="left" delay={i * 0.09} scaleFrom={1} rotate={0.5} rule>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="group grid w-full grid-cols-[1fr_auto] items-start gap-5 py-8 text-left sm:gap-10 sm:py-10"
                >
                  <span className="grid gap-5 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-12">
                    <RevealLayer as="span" from="left" distance={20} className="block">
                      <span
                        className="display text-display-sm block transition-colors duration-400"
                        style={{ color: isOpen ? s.tone : undefined }}
                      >
                        {s.title}
                      </span>
                    </RevealLayer>
                    <RevealLayer as="span" from="left" delay={0.13} distance={20} className="block">
                      <span className="block max-w-lg text-[14px] leading-[1.7] text-muted-2 lg:pt-1">
                        {s.blurb}
                      </span>
                    </RevealLayer>
                  </span>

                  <RevealLayer as="span" delay={0.24} distance={0} scaleFrom={0.5} className="block">
                    <span
                      className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-lg transition-all duration-500"
                      style={{
                        transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                        background: isOpen ? s.tone : undefined,
                        borderColor: isOpen ? s.tone : undefined,
                        color: isOpen ? "#fff" : undefined,
                      }}
                    >
                      +
                    </span>
                  </RevealLayer>
                </button>

                {/* Accordion — grid-rows 0fr→1fr replaces framer-motion height:auto. */}
                <div
                  className="grid transition-all duration-[600ms] ease-[cubic-bezier(0.76,0,0.24,1)]"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr", opacity: isOpen ? 1 : 0 }}
                >
                  <div className="overflow-hidden">
                    <div className="grid gap-8 pb-10 lg:grid-cols-[auto_1fr] lg:gap-16">
                      <div className="flex flex-wrap items-start content-start gap-2">
                        {s.tags.map((t) => (
                          <span
                            key={t}
                            className="meta rounded-full border border-line px-3.5 py-2 text-ink/70"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <div
                        className="relative h-36 overflow-hidden rounded-sm sm:h-44"
                        style={{
                          background: `linear-gradient(125deg, ${s.tone} 0%, ${s.tone}b3 45%, #0b0b0b 100%)`,
                        }}
                      >
                        <span className="display absolute inset-0 flex items-center justify-center text-[clamp(1.75rem,4vw,3rem)] text-white/20">
                          {s.num}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
