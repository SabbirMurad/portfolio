/* global React, Reveal, RevealLayer, SplitHeading, journey */
function Journey() {
  return (
    <section className="bg-paper py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <SplitHeading
          as="h2"
          text="Purpose-driven work for modern companies"
          className="display text-display-lg max-w-[14ch]"
        />

        <div className="mt-16 border-t border-line">
          {journey.map((j, i) => (
            <Reveal key={j.role} from="left" delay={i * 0.09} scaleFrom={1} rotate={0.5} rule>
              <div className="group grid gap-4 py-8 transition-colors duration-500 hover:bg-bone sm:py-10 lg:grid-cols-[13rem_1fr_1.1fr] lg:gap-10">
                <RevealLayer distance={18} from="left">
                  <p className="display-tight text-lg font-bold">{j.period}</p>
                  <span className="meta mt-2 inline-block rounded-full bg-ink/[0.055] px-3 py-1.5 text-muted-2">
                    {j.kind}
                  </span>
                </RevealLayer>

                <RevealLayer delay={0.13} distance={18} from="left">
                  <h3 className="display-tight text-2xl font-bold transition-colors duration-400 group-hover:text-vermilion">
                    {j.role}
                  </h3>
                  <p className="meta mt-2 text-muted-2">{j.org}</p>
                </RevealLayer>

                <RevealLayer delay={0.26} distance={18} from="left">
                  <p className="max-w-lg text-[14px] leading-[1.75] text-muted-2">{j.body}</p>
                </RevealLayer>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
