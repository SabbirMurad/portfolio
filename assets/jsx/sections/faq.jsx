/* global React, Reveal, SplitHeading, faqs */
function Faq() {
  const { useState } = React;
  const [open, setOpen] = useState(0);

  return (
    <section className="bg-paper py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SplitHeading
              as="h2"
              text="Frequent questions"
              className="display text-display-lg max-w-[8ch]"
            />
            <Reveal delay={0.15} scaleFrom={1}>
              <p className="mt-6 max-w-xs text-[14px] leading-[1.75] text-muted-2">
                Anything not covered here? Send it over — I answer every message personally.
              </p>
            </Reveal>
          </div>

          <div className="border-t border-line">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <Reveal key={f.q} from="right" delay={i * 0.07} scaleFrom={1} rotate={0.5} rule>
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start justify-between gap-6 py-6 text-left"
                  >
                    <span className="flex gap-4">
                      <span className="meta pt-1 text-muted">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`text-[15px] font-semibold transition-colors duration-400 sm:text-base ${
                          isOpen ? "text-vermilion" : ""
                        }`}
                      >
                        {f.q}
                      </span>
                    </span>
                    <span
                      className={`mt-0.5 shrink-0 text-xl transition-transform duration-500 ${
                        isOpen ? "rotate-45 text-vermilion" : "text-muted"
                      }`}
                    >
                      +
                    </span>
                  </button>

                  <div
                    className="grid transition-all duration-[550ms] ease-[cubic-bezier(0.76,0,0.24,1)]"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr", opacity: isOpen ? 1 : 0 }}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-2xl pb-7 pl-10 text-[14px] leading-[1.8] text-muted-2">
                        {f.a}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
