/* global React, Parallax, Reveal, RevealLayer, SplitHeading, Counter, profile, stats */
function Impact() {
  return (
    <section id="about" className="bg-bone py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_minmax(300px,1fr)] lg:items-start lg:gap-20">
          <SplitHeading
            as="h2"
            text="My impact through engineering and design"
            className="display max-w-[14ch] text-[clamp(2.75rem,7.6vw,7rem)] font-black!"
          />

          {/* Portrait, blurb and button stack in the right column so the left
              is left to the heading alone. The blurb is clamped rather than
              cut in the source: the full two paragraphs live on /about, and
              the ellipsis is what makes the button below it read as the way
              to the rest. */}
          <Parallax amount={26}>
            <Reveal from="right" delay={0.1} rotate={0.8}>
              <div className="lg:pb-3">
                <RevealLayer distance={22} from="right">
                  <div className="aspect-square w-full overflow-hidden rounded-sm bg-line lg:ml-auto lg:max-w-[420px]">
                    <img
                      src="/assets/image/sabbir_hassan.webp"
                      alt={profile.fullName}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                </RevealLayer>

                <RevealLayer delay={0.16} distance={22} from="right">
                  <p className="mt-6 line-clamp-3 text-[15px] leading-[1.75] text-muted-2">
                    I&apos;m a fullstack developer and designer who works where complex
                    engineering meets elegant interface. I write systems-level Rust for
                    performance-critical backends and build cross-platform apps in Flutter — then
                    design the surface they live behind. A competitive programming background in
                    C++ sharpens the algorithmic thinking; design work in Figma keeps every
                    interface intentional. Great software is invisible — it gets out of the way
                    and just works.
                  </p>
                </RevealLayer>

                {/* A button rather than the quiet text link the Projects and
                    Docs sections use: there, every card is a way through to the
                    same place, so the "view all" is genuinely secondary. Here
                    it is the only route to /about, and at 11px muted grey
                    beside a display heading nobody found it. */}
                <RevealLayer delay={0.22} distance={18} from="right">
                  <a
                    href="/about"
                    data-cursor="view"
                    data-cursor-label="ABOUT"
                    className="group mt-6 inline-flex items-center gap-3 rounded-sm bg-ink px-6 py-3.5 text-white transition-colors duration-400 hover:bg-vermilion"
                  >
                    <span className="meta">Read the full story</span>
                    <span className="inline-block transition-transform duration-400 group-hover:translate-x-1">
                      →
                    </span>
                  </a>
                </RevealLayer>
              </div>
            </Reveal>
          </Parallax>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-line lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className="h-full bg-bone px-6 py-9 sm:px-8 sm:py-11">
              <Reveal delay={i * 0.1} scaleFrom={1} distance={40}>
                <RevealLayer distance={22}>
                  <p className="display-tight text-5xl font-bold sm:text-6xl">
                    <Counter to={s.value} suffix={s.suffix} />
                  </p>
                </RevealLayer>
                <RevealLayer delay={0.18} distance={16}>
                  <p className="meta mt-3 text-muted-2">{s.label}</p>
                </RevealLayer>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
