/* global React, gsap, ScrollTrigger, profile */
/*
 * Hero — build-less port of the Next/framer-motion Hero.
 *
 * Same structure and Tailwind classes as the original; framer-motion's
 * useScroll/useTransform and entrance/idle motion are re-expressed with GSAP:
 *   • scroll-linked  → ScrollTrigger scrub tweens (name/portrait parallax, fade)
 *   • entrance       → a mount timeline (name reveal, tagline, card, portrait)
 *   • idle drift     → infinite yoyo tweens
 * Elements are tagged with data-hero-* and selected inside a gsap.context so
 * the whole effect tears down cleanly.
 */

const HERO_FIELD = "linear-gradient(270deg, rgb(43 43 43), rgb(8, 8, 8))";
const HERO_OVERLAY = "linear-gradient(100deg, rgb(0 0 0 / 91%), rgb(43 43 43))";
const HERO_GRID_ROWS = ["var(--nav-h)", "35%", "70%"];
/* Left side bearings for Archivo 700 — pull the ink onto the grid line. */
const HERO_BEARING_H = "-0.0625em";
const HERO_BEARING_S = "-0.0417em";
/* Close approximation of the original cubic-bezier(0.16, 1, 0.3, 1). */
const HERO_EASE = "expo.out";

function HeroCrosshair({ top, side }) {
  return (
    <span
      style={{ top }}
      className={`absolute -translate-y-1/2 text-[11px] leading-none text-white/30 ${
        side === "left" ? "-left-[4.5px]" : "-right-[4.5px]"
      }`}
    >
      +
    </span>
  );
}

function Hero() {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // reduced-motion: leave everything at its natural resting state

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);

      /* ── scroll-linked parallax ──
         Name (ghost wordmark + h1) drifts up, portrait drifts down, over one
         viewport of scroll — the hero is 100dvh and the next section is flush. */
      gsap.to(q("[data-hero-name]"), {
        yPercent: -45,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(q("[data-hero-portrait]"), {
        yPercent: 18,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true },
      });
      /* Tagline fades out over the first three-quarters of that scroll. */
      gsap.to(q("[data-hero-tagline]"), {
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "75% top", scrub: true },
      });

      /* ── entrance timeline ── */
      const tl = gsap.timeline();
      tl.from(q("[data-hero-portrait]"), { opacity: 0, scale: 1.06, duration: 1.4, ease: HERO_EASE }, 0.15)
        .from(q("[data-hero-name-inner]"), { yPercent: 105, duration: 1.25, ease: HERO_EASE }, 0.25)
        .from(q("[data-hero-tagline-p]"), { opacity: 0, y: 20, duration: 1, ease: HERO_EASE }, 0.5)
        .from(q("[data-hero-year]"), { opacity: 0, duration: 0.8 }, 0.75)
        .from(q("[data-hero-card]"), { opacity: 0, y: 30, duration: 1, ease: HERO_EASE }, 0.85);

      /* ── idle drift (forever) ──
         Distance scales with the element; each has its own period/offset so
         they read as separate things breathing rather than one block sliding. */
      const drift = (sel, distance, period, delay) =>
        gsap.to(q(sel), {
          y: -distance,
          duration: period / 2,
          delay,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      drift("[data-hero-ghost]", 22, 8, 0);
      drift("[data-hero-h1-drift]", 17, 6.6, 1.1);
      drift("[data-hero-card-drift]", 9, 5.4, 1.9);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={ref}
      id="home"
      data-cursor-theme="dark"
      style={{ background: HERO_FIELD }}
      className="relative min-h-[100dvh] overflow-hidden text-white"
    >
      {/* Measurement grid. */}
      <div className="pointer-events-none absolute inset-0">
        {HERO_GRID_ROWS.map((top) => (
          <span key={top} style={{ top }} className="absolute inset-x-0 h-px bg-white/[0.09]" />
        ))}

        <div className="mx-auto grid h-full max-w-[1600px] grid-cols-3 px-5 sm:px-8 lg:px-12">
          {[0, 1, 2].map((col) => (
            <div key={col} className="relative border-l border-white/[0.09] last:border-r">
              {HERO_GRID_ROWS.map((top) => (
                <HeroCrosshair key={`l-${top}`} top={top} side="left" />
              ))}
              {col === 2 &&
                HERO_GRID_ROWS.map((top) => (
                  <HeroCrosshair key={`r-${top}`} top={top} side="right" />
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Ghost surname — scroll parallax on the wrapper, idle drift on the glyph. */}
      <div
        data-hero-name
        aria-hidden
        style={{ top: "var(--nav-h)", height: "calc(35% - var(--nav-h))" }}
        className="pointer-events-none absolute inset-x-0 select-none"
      >
        <div className="mx-auto flex h-full max-w-[1600px] items-center px-5 sm:px-8 lg:px-12">
          <span
            data-hero-ghost
            className="display leading-none text-white/[0.11] will-change-transform"
            style={{ fontSize: "min(calc((35dvh - var(--nav-h)) * 1.2), 22vw)", marginLeft: HERO_BEARING_H }}
          >
            {profile.surname}
          </span>
        </div>
      </div>

      {/* Cut-out portrait — entrance (opacity/scale) + scroll parallax. */}
      <div
        data-hero-portrait
        className="pointer-events-none absolute bottom-0 left-1/2 h-[96%] -translate-x-1/2 will-change-transform"
      >
        <img
          src="/assets/image/hero_image.png"
          alt={profile.fullName}
          width={1323}
          height={1189}
          className="h-full w-auto max-w-none object-contain object-bottom"
        />
      </div>

      {/* Bottom blend — covers the portrait's foot only. */}
      <div
        aria-hidden
        style={{
          background: HERO_OVERLAY,
          maskImage: "linear-gradient(to top, #000 0%, #000 12%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top, #000 0%, #000 12%, transparent 100%)",
        }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%]"
      />

      {/* Tagline — second grid row, first column. Fades on scroll, enters on load. */}
      <div data-hero-tagline style={{ top: "35%" }} className="absolute inset-x-0 will-change-[opacity]">
        <div className="mx-auto grid max-w-[1600px] grid-cols-3 px-5 sm:px-8 lg:px-12">
          <p
            data-hero-tagline-p
            className="max-w-[24rem] pt-3 text-[17px] font-medium uppercase leading-[1.58]"
          >
            {profile.tagline}
          </p>
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1600px] flex-col px-5 pb-7 pt-[var(--nav-h)] sm:px-8 lg:px-12">
        <div className="flex-1" />

        {/* Bottom row */}
        <div className="relative flex items-end justify-between gap-6">
          <div className="min-w-0">
            <p data-hero-year className="mb-1 text-[13px] font-semibold">©{profile.year}</p>

            {/* drift wrapper → h1 (scroll) → clip span → inner reveal */}
            <div data-hero-h1-drift className="will-change-transform">
              <h1 data-hero-name className="display text-display-xl select-none" style={{ marginLeft: HERO_BEARING_S }}>
                <span className="block overflow-hidden">
                  <span data-hero-name-inner className="block">
                    {profile.name}
                  </span>
                </span>
              </h1>
            </div>
          </div>

          {/* Let's-talk card — drift wrapper → entrance anchor. */}
          <div data-hero-card-drift className="shrink-0 will-change-transform">
            <a
              data-hero-card
              href="#contact"
              data-cursor="view"
              className="group hidden h-[124px] shrink-0 items-stretch gap-4 rounded-xl bg-ink p-3 sm:flex"
            >
              <span className="relative block w-[92px] shrink-0 overflow-hidden rounded-lg bg-vermilion">
                <img
                  src="/assets/image/hero_image.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              </span>

              <span className="flex min-w-[188px] flex-col justify-between py-0.5 pr-0.5">
                <span className="flex items-start justify-between gap-6">
                  <span className="text-[15px] font-semibold leading-none">Let&apos;s talk</span>
                  <span className="text-[13px] leading-none text-white/70">✳</span>
                </span>

                <span className="flex items-end justify-between gap-6">
                  <span className="block leading-tight">
                    <span className="block text-[17px] font-bold">{profile.fullName}</span>
                    <span className="mt-0.5 block text-[12px] text-white/50">{profile.role}</span>
                  </span>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-base text-ink transition-colors duration-400 group-hover:bg-vermilion group-hover:text-white">
                    ↗
                  </span>
                </span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
