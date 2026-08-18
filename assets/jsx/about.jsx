/* global React, ReactDOM, gsap, ScrollTrigger, Lenis, Cursor, Ripple, Reveal, RevealLayer, SplitHeading, Counter, SocialIcon, displayUrl, profile, stats, stack, journey, navLinks, socials */
/*
 * About — the standalone bio page, in the new design language.
 *
 * Header/footer/hero rhythm mirrors pages/documentations.html and
 * pages/projects.html. Content is drawn from the same `data.jsx` the home
 * page's Impact and Journey sections use — the bio paragraphs are copied
 * rather than shared (same call as the docs/projects cards: identical
 * classes, independent source), everything else (stats, stack, journey) reads
 * from the shared arrays so this page can't drift out of sync with them.
 */

gsap.registerPlugin(ScrollTrigger);

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.8,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ── Header ── */
function AboutHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bone/80 backdrop-blur-md">
      <div className="mx-auto flex h-[var(--nav-h)] max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <a href="/" className="display-tight text-[23px] font-bold tracking-tight">
          {profile.name}
          <sup className="ml-0.5 text-[10px]">®</sup>
        </a>
        <a
          href="/"
          className="meta group inline-flex items-center gap-2 text-muted-2 transition-colors duration-300 hover:text-ink"
        >
          <span className="inline-block transition-transform duration-400 group-hover:-translate-x-1">
            ←
          </span>
          Back to the site
        </a>
      </div>
    </header>
  );
}

/* ── Footer ── */
function AboutFooter() {
  return (
    <footer className="bg-paper px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-8 border-t border-line pt-10">
        <p className="meta text-muted">
          © {profile.year} {profile.fullName}
        </p>
        <nav aria-label="Site" className="flex flex-wrap gap-x-7 gap-y-2">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={"/" + l.href}
              className="meta text-muted-2 transition-colors duration-300 hover:text-vermilion"
            >
              {l.label}
            </a>
          ))}
          {socials.slice(0, 2).map((s) => (
            <a
              key={s.href}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="meta text-muted-2 transition-colors duration-300 hover:text-vermilion"
            >
              {s.label} ↗
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

/* ── Page ── */
function About() {
  return (
    <React.Fragment>
      <AboutHeader />

      {/* ── Hero ── */}
      <section
        data-cursor-theme="dark"
        className="bg-ink px-5 pb-16 pt-20 text-white sm:px-8 sm:pb-20 sm:pt-24 lg:px-12 lg:pt-28"
      >
        <div className="mx-auto max-w-[1600px]">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16">
            <Reveal scaleFrom={1.06} distance={0} className="order-2 lg:order-1">
              <div className="mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-sm bg-ink-2 lg:mx-0">
                <img
                  src="/assets/image/hero_image.webp"
                  alt={profile.fullName}
                  decoding="async"
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </Reveal>

            <div className="order-1 lg:order-2">
              <Reveal distance={26}>
                <p className="meta text-white/50">About</p>
              </Reveal>

              <Reveal delay={0.08} distance={34}>
                <h1 className="display text-display-lg mt-5">
                  {profile.fullName}
                </h1>
              </Reveal>

              <Reveal delay={0.14} distance={24}>
                <p className="meta mt-3 text-white/50">{profile.role}</p>
              </Reveal>

              <Reveal delay={0.2} distance={22} className="mt-6 max-w-lg">
                <p className="text-[14px] leading-[1.75] text-white/60">{profile.tagline}.</p>
              </Reveal>

              <Reveal delay={0.28} distance={18} className="mt-8 flex flex-wrap gap-3">
                {socials.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="meta group inline-flex items-center gap-2 rounded-full border border-line-dark px-3.5 py-2 text-white/70 transition-colors duration-300 hover:border-white/35 hover:text-white"
                  >
                    <span className="grid h-3.5 w-3.5 place-items-center [&_svg]:h-full [&_svg]:w-full">
                      <SocialIcon label={s.label} />
                    </span>
                    {s.label}
                  </a>
                ))}
                <a
                  href={`mailto:${profile.email}`}
                  className="meta rounded-full border border-line-dark px-3.5 py-2 text-white/70 transition-colors duration-300 hover:border-white/35 hover:text-white"
                >
                  {profile.email}
                </a>
              </Reveal>
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-line-dark sm:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label} className="h-full bg-ink-2 px-6 py-9 sm:px-8 sm:py-11">
                <Reveal delay={i * 0.1} scaleFrom={1} distance={40}>
                  <RevealLayer distance={22}>
                    <p className="display-tight text-4xl font-bold sm:text-5xl">
                      <Counter to={s.value} suffix={s.suffix} />
                    </p>
                  </RevealLayer>
                  <RevealLayer delay={0.18} distance={16}>
                    <p className="meta mt-3 text-white/50">{s.label}</p>
                  </RevealLayer>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Story ── */}
      <section className="bg-paper py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-20">
            <SplitHeading
              as="h2"
              text="From curiosity to craft"
              className="display text-display-lg max-w-[13ch]"
            />

            <Reveal from="right" delay={0.1} rotate={0.8}>
              <RevealLayer distance={22} from="right">
                <p className="max-w-md text-[15px] leading-[1.75] text-muted-2">
                  I&apos;m a fullstack developer and designer who works where complex engineering
                  meets elegant interface. I write systems-level Rust for performance-critical
                  backends and build cross-platform apps in Flutter — then design the surface they
                  live behind.
                </p>
              </RevealLayer>

              <RevealLayer delay={0.16} distance={22} from="right">
                <p className="mt-5 max-w-md text-[15px] leading-[1.75] text-muted-2">
                  A competitive programming background in C++ sharpens the algorithmic thinking;
                  design work in Figma keeps every interface intentional. Great software is
                  invisible — it gets out of the way and just works.
                </p>
              </RevealLayer>
            </Reveal>
          </div>

          {/* Daily drivers */}
          <div className="mt-16 border-t border-line pt-10">
            <Reveal>
              <p className="meta text-muted-2">Daily drivers — the stack I build production work on</p>
            </Reveal>
            <div className="mt-6 flex flex-wrap gap-2">
              {stack.map((s, i) => (
                <Reveal key={s.name} delay={(i % 6) * 0.05} scaleFrom={1} distance={14}>
                  <span className="meta inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-ink/70">
                    <img src={s.icon} alt="" aria-hidden className="h-4 w-4 object-contain" />
                    {s.name}
                  </span>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Journey ── */}
      <section className="bg-bone py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          <SplitHeading
            as="h2"
            text="Where the work has taken me"
            className="display text-display-lg max-w-[14ch]"
          />

          <div className="mt-16 border-t border-line">
            {journey.map((j, i) => (
              <Reveal key={j.role} from="left" delay={i * 0.09} scaleFrom={1} rotate={0.5} rule>
                <div className="group grid gap-4 py-8 transition-colors duration-500 hover:bg-paper sm:py-10 lg:grid-cols-[13rem_1fr_1.1fr] lg:gap-10">
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

      <AboutFooter />
    </React.Fragment>
  );
}

function App() {
  return (
    <React.Fragment>
      <Cursor />
      <Ripple />
      <About />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
