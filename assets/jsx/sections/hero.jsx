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
/* The row the résumé tab hangs from — drawn with the tab, not with the grid. */
const HERO_ROW_RESUME = "35%";
const HERO_GRID_ROWS = ["var(--nav-h)", HERO_ROW_RESUME, "70%"];
/* Left side bearings for Archivo 700 — pull the ink onto the grid line. */
const HERO_BEARING_H = "-0.0625em";
const HERO_BEARING_S = "-0.0417em";
/* Close approximation of the original cubic-bezier(0.16, 1, 0.3, 1). */
const HERO_EASE = "expo.out";

function HeroCrosshair({ top, side, className = "" }) {
  return (
    <span
      style={{ top }}
      className={`absolute -translate-y-1/2 text-[11px] leading-none text-white/30 ${
        side === "left" ? "-left-[4.5px]" : "-right-[4.5px]"
      } ${className}`}
    >
      +
    </span>
  );
}

function Hero() {
  const ref = React.useRef(null);

  /* Row 2 of the grid stops either side of the résumé tab, and it is drawn up
     in the grid layer so it passes behind the portrait like the other rows —
     which means that layer needs the tab's width. Measured rather than assumed:
     the label is copy, and copy is as wide as the font that actually loaded.
     offsetWidth is 0 while the tab is display:none under sm, which is exactly
     the value the rule wants there. */
  React.useEffect(() => {
    const root = ref.current;
    const tab = root && root.querySelector("[data-hero-resume]");
    if (!tab) return;
    const measure = () => root.style.setProperty("--hero-resume-w", `${tab.offsetWidth}px`);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(tab);
    /* The observer covers the breakpoint and the webfont swap on its own, but
       only while the tab is rendering; these two catch the same moments when it
       is not, so a page restored in the background still comes back correct. */
    window.addEventListener("resize", measure);
    if (document.fonts) document.fonts.ready.then(measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

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
        .from(q("[data-hero-card]"), { opacity: 0, y: 30, duration: 1, ease: HERO_EASE }, 0.85)
        .from(
          q("[data-hero-resume]"),
          { clipPath: "inset(0 -16px 100% -16px)", opacity: 0, duration: 0.9, ease: HERO_EASE },
          0.9,
        );

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
      {/* Measurement grid. Row 2 is missing from this set on purpose: it runs
          into the résumé tab's carve, so it is drawn down there instead, where
          it can stop at the right place. The crosshairs still cover all three. */}
      <div className="pointer-events-none absolute inset-0">
        {HERO_GRID_ROWS.filter((top) => top !== HERO_ROW_RESUME).map((top) => (
          <span key={top} style={{ top }} className="absolute inset-x-0 h-px bg-white/[0.09]" />
        ))}

        {/* Row 2, in two runs: it stops at the tab's carve and picks up again
            past the bend the column rule makes. -left/w-50vw carry each run out
            to the edges of a section that clips them. */}
        <div className="absolute inset-x-0" style={{ top: HERO_ROW_RESUME }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
            <div className="relative">
              <span className="absolute -left-[50vw] right-0 top-0 h-px bg-white/[0.09] sm:right-[calc(var(--hero-resume-w,0px)+15px)]" />
              <span className="absolute left-full top-0 h-px w-[50vw] bg-white/[0.09] sm:ml-[15px]" />
            </div>
          </div>
        </div>

        <div className="mx-auto grid h-full max-w-[1600px] grid-cols-3 px-5 sm:px-8 lg:px-12">
          {[0, 1, 2].map((col) => (
            <div key={col} className="relative border-l border-white/[0.09]">
              {HERO_GRID_ROWS.map((top) => (
                <HeroCrosshair key={`l-${top}`} top={top} side="left" />
              ))}

              {/* The right-hand rule. From sm up the résumé tab hangs off this
                  corner, and the rule turns into row 2 rather than crossing it —
                  from both directions. Coming down it stops 15px short and bends
                  right; coming up it is the tab's right wall, which the shoulder
                  carve sweeps out to the same point. Both meet the row line
                  tangentially 15px past the corner. Under sm there is no tab, so
                  it is one plain rule and row 2 crosses it as usual. */}
              {col === 2 && (
                <React.Fragment>
                  <span className="absolute inset-y-0 right-0 w-px bg-white/[0.09] sm:hidden" />

                  <span
                    style={{ height: `calc(${HERO_ROW_RESUME} - 15px)` }}
                    className="absolute right-0 top-0 hidden w-px bg-white/[0.09] sm:block"
                  />
                  <span
                    style={{ top: `calc(${HERO_ROW_RESUME} + 16px)` }}
                    className="absolute bottom-0 right-0 hidden w-px bg-white/[0.09] sm:block"
                  />
                  {/* The bend. Bottom-left radius eats both of this box's edges,
                      so its left + bottom borders render as one quarter circle,
                      handing the rule off to the row line 15px further right. */}
                  <span
                    style={{ top: `calc(${HERO_ROW_RESUME} - 15px)`, right: "-15px" }}
                    className="absolute hidden h-4 w-4 rounded-bl-[16px] border-b border-l border-white/[0.09] sm:block"
                  />

                  {HERO_GRID_ROWS.map((top) => (
                    <HeroCrosshair
                      key={`r-${top}`}
                      top={top}
                      side="right"
                      className={top === HERO_ROW_RESUME ? "sm:hidden" : ""}
                    />
                  ))}
                </React.Fragment>
              )}
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
          src="/assets/image/hero_image.webp"
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
        {/* Résumé — a tab hanging off the row-2 grid line, right edge flush with
            the nav and the "Let's talk" card below (this div's own padding box),
            so all three line up. The outline, the label pair and the arrow tile
            are what make it read as the action it is; there is no resting fill,
            only a backdrop blur, so it stays legible on the narrower viewports
            where the portrait passes behind it, and the vermilion arrives on
            hover.

            Its shape is split across five boxes because a CSS box cannot
            express a concave corner: a skin, and two halves — wedge and arc —
            for each shoulder. Enters by unfurling downward out of the line,
            hence the resting clip-path, whose side offsets are negative so it
            does not cut the carves off. */}
        <a
          data-hero-resume
          href="/resume"
          data-cursor-label="OPEN"
          style={{ top: HERO_ROW_RESUME, clipPath: "inset(0 -16px 0% -16px)" }}
          className="group absolute right-5 z-10 hidden w-fit items-center gap-5 py-3 pl-5 pr-3 sm:right-8 sm:flex lg:right-12"
        >
          {/* Skin: the plain box — fill, blur, outline. The clip lifts a
              1px × 16px sliver off the top of each side border; with a carve
              attached, those stretches are interior to the shape rather than
              edges of it, and leaving them drawn is what puts a square corner
              back under the curve. */}
          <span
            aria-hidden="true"
            style={{
              clipPath:
                "polygon(1px 0, calc(100% - 1px) 0, calc(100% - 1px) 16px, 100% 16px, 100% 100%, 0 100%, 0 16px, 1px 16px)",
            }}
            className="absolute inset-0 rounded-b-xl border border-t-0 border-white/15 backdrop-blur-md transition-colors duration-400 group-hover:border-vermilion group-hover:bg-vermilion"
          />

          {/* Carve, part one: the wedge of body that lives outside the skin —
              everything in this 16px box further than 16px from its own bottom
              left corner. Painted through currentColor so it picks up the skin's
              hover vermilion and the shape reads as one solid body, and it runs
              a hair under the arc so the two never leave a seam. Fill and stroke
              have to be separate boxes: the radius that draws the arc would clip
              this gradient away to nothing. */}
          <span
            aria-hidden="true"
            style={{
              background: "radial-gradient(circle 16px at 0 100%, transparent 0 15px, currentColor 15px)",
            }}
            className="absolute -left-[15px] top-0 h-4 w-4 text-transparent transition-colors duration-400 group-hover:text-vermilion"
          />

          {/* Carve, part two: the arc. The top-right radius eats both of this
              box's edges, so its top + right borders render as one quarter
              circle — the row line easing down into the tab's left wall, its
              right border column landing exactly on the skin's. It keeps the
              line's colour on hover: this is the grid arriving at the tab, not
              part of the button. */}
          <span
            aria-hidden="true"
            className="absolute -left-[15px] top-0 h-4 w-4 rounded-tr-[16px] border-r border-t border-white/15"
          />

          {/* The right shoulder, the same two boxes mirrored. Its arc lands on
              the column rule where the rule resumes below, so the wall coming up
              from the bottom curves off to the row line just as the rule coming
              down from the top bends into it. */}
          <span
            aria-hidden="true"
            style={{
              background: "radial-gradient(circle 16px at 100% 100%, transparent 0 15px, currentColor 15px)",
            }}
            className="absolute -right-[15px] top-0 h-4 w-4 text-transparent transition-colors duration-400 group-hover:text-vermilion"
          />
          <span
            aria-hidden="true"
            className="absolute -right-[15px] top-0 h-4 w-4 rounded-tl-[16px] border-l border-t border-white/15"
          />

          <span className="relative flex flex-col">
            <span className="meta text-white/45 transition-colors duration-400 group-hover:text-white/75">
              Curriculum vitae
            </span>
            <span className="whitespace-nowrap text-[17px] font-semibold leading-tight">Résumé</span>
          </span>

          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-base text-ink transition-transform duration-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            ↗
          </span>
        </a>

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
                  src="/assets/image/hero_image.webp"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              </span>

              <span className="flex min-w-[188px] flex-col justify-between py-0.5 pr-0.5">
                <span className="flex items-start justify-between gap-6">
                  <span className="text-[15px] font-semibold leading-none">Let&apos;s talk</span>
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
