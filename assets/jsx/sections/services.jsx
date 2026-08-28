/* global React, Reveal, RevealLayer, SplitHeading, services */
/*
 * A small looping "scene" per service, keyed by data.jsx's `icon` field — a
 * server blinking and pushing packets out, a browser loading, a phone feed
 * scrolling, a path being drawn, a terminal typing, a network pulsing, a
 * chat replying. Built from plain shapes (no icon set, no stock imagery) so
 * it stays in the site's typographic, no-photography language.
 *
 * Chrome (borders, window dots, placeholder bars) stays neutral ink so the
 * scene reads as a clean mock — color lives only in the part that's actually
 * moving (the blinking light, the flowing packet, the loading bars, the
 * caret, the pulsing nodes, the typing dots), tinted with the service's own
 * `tone`. That's the section's only use of color here; there's no longer a
 * full-bleed tone background behind it.
 *
 * The animation classes (svc-*) live in assets/css/global.css, alongside
 * this section's other keyframes, and are flattened by the shared
 * reduced-motion rule.
 */
const SVC_LINE = "rgba(11, 11, 11, 0.14)";
const SVC_LINE_STRONG = "rgba(11, 11, 11, 0.22)";

function ServiceScene({ icon, tone }) {
  switch (icon) {
    case "server":
      return (
        <div className="flex w-full max-w-[280px] flex-col gap-3">
          {[0, 1].map((row) => (
            <div
              key={row}
              className="flex items-center gap-3 rounded-[4px] border px-4 py-3"
              style={{ borderColor: SVC_LINE_STRONG }}
            >
              <span
                className="svc-blink h-2 w-2 shrink-0 rounded-full"
                style={{ background: tone, animationDelay: `${row * 0.5}s` }}
              />
              <span className="h-1.5 flex-1 rounded-full" style={{ background: SVC_LINE }} />
              <span className="h-1.5 w-8 rounded-full" style={{ background: SVC_LINE }} />
            </div>
          ))}
          <div className="relative mt-1 h-px w-full" style={{ background: SVC_LINE }}>
            <span
              className="svc-flow top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
              style={{ background: tone }}
            />
          </div>
        </div>
      );
    case "globe":
      return (
        <div
          className="w-full max-w-[320px] overflow-hidden rounded-[8px] border bg-paper"
          style={{ borderColor: SVC_LINE_STRONG }}
        >
          <div
            className="flex items-center gap-2 border-b px-3.5 py-2.5"
            style={{ borderColor: SVC_LINE }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full"
                style={{ background: SVC_LINE_STRONG }}
              />
            ))}
            <span className="ml-2 h-2 flex-1 rounded-full" style={{ background: SVC_LINE }} />
          </div>
          <div className="flex flex-col gap-3 px-4 py-4">
            {[0.9, 0.6, 0.75].map((w, i) => (
              <span
                key={i}
                className="svc-grow h-2 rounded-full"
                style={{
                  background: tone,
                  opacity: 0.55,
                  "--svc-line-w": `${w * 100}%`,
                  animationDelay: `${i * 0.25}s`,
                }}
              />
            ))}
          </div>
        </div>
      );
    case "smartphone":
      return (
        <div
          className="relative h-[190px] w-[104px] overflow-hidden rounded-[20px] border-[3px]"
          style={{ borderColor: tone }}
        >
          <div className="svc-scroll absolute inset-x-0 top-0 flex flex-col gap-2.5 p-2.5">
            {[...Array(6)].map((_, i) => (
              <span
                key={i}
                className="h-12 w-full shrink-0 rounded-[6px]"
                style={{ background: SVC_LINE }}
              />
            ))}
          </div>
        </div>
      );
    case "palette":
      return (
        <svg viewBox="0 0 120 70" className="h-24 w-full max-w-[280px]">
          <path
            d="M6 55 C 20 10, 60 10, 70 30 S 100 55, 114 20"
            fill="none"
            stroke={tone}
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength="1"
            className="svc-draw"
          />
          <circle cx="30" cy="18" r="4" fill={tone} fillOpacity="0.85" />
          <circle cx="60" cy="46" r="4" fill={tone} fillOpacity="0.55" />
          <circle cx="95" cy="14" r="4" fill={tone} fillOpacity="0.3" />
        </svg>
      );
    case "monitor":
      return (
        <div
          className="w-full max-w-[320px] overflow-hidden rounded-[8px] border bg-paper"
          style={{ borderColor: SVC_LINE_STRONG }}
        >
          <div
            className="flex items-center gap-2 border-b px-3.5 py-2.5"
            style={{ borderColor: SVC_LINE }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full"
                style={{ background: SVC_LINE_STRONG }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-3 px-4 py-4">
            {[0.7, 0.5].map((w, i) => (
              <span
                key={i}
                className="svc-grow h-2 rounded-[2px]"
                style={{
                  background: tone,
                  opacity: 0.55,
                  "--svc-line-w": `${w * 100}%`,
                  animationDelay: `${i * 0.6}s`,
                }}
              />
            ))}
            <span className="svc-caret h-4 w-2 rounded-[1px]" style={{ background: tone }} />
          </div>
        </div>
      );
    case "cpu": {
      const nodes = [
        [20, 20],
        [20, 60],
        [70, 40],
        [120, 18],
        [120, 42],
        [120, 66],
      ];
      return (
        <svg viewBox="0 0 140 80" className="h-28 w-full max-w-[280px]">
          <g stroke={SVC_LINE_STRONG} strokeWidth="1.5">
            <line x1="20" y1="20" x2="70" y2="40" />
            <line x1="20" y1="60" x2="70" y2="40" />
            <line x1="70" y1="40" x2="120" y2="18" />
            <line x1="70" y1="40" x2="120" y2="42" />
            <line x1="70" y1="40" x2="120" y2="66" />
          </g>
          {nodes.map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="5"
              fill={tone}
              className="svc-pulse-node"
              style={{ transformOrigin: `${cx}px ${cy}px`, animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </svg>
      );
    }
    case "chat":
      return (
        <div className="flex w-full max-w-[260px] flex-col gap-3">
          <div
            className="max-w-[75%] rounded-[12px] rounded-bl-[3px] border bg-paper px-4 py-2.5"
            style={{ borderColor: SVC_LINE_STRONG }}
          >
            <span className="block h-2 w-20 rounded-full" style={{ background: SVC_LINE }} />
          </div>
          <div
            className="ml-auto flex max-w-[60%] items-center gap-1.5 rounded-[12px] rounded-br-[3px] px-4 py-3"
            style={{ background: `${tone}26` }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="svc-bounce-dot h-2 w-2 rounded-full"
                style={{ background: tone, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

function Services() {
  const { useState, useEffect, useRef } = React;
  const ref = useRef(null);
  const [active, setActive] = useState(0);

  /* Scroll drives the section: the active service is the last row whose heading
     has reached the focal line. Nothing in the list opens or closes any more —
     the detail lives in a sticky stage that is out of the flow — so the rows
     never move, and reading their live positions is both exact and stable. An
     accordion could not do this: collapsing a panel moved every heading below
     it, which let one switch shove the next heading past the line too, and the
     section skipped a row and lurched while it did. */
  useEffect(() => {
    const root = ref.current;
    const heads = root ? Array.from(root.querySelectorAll("[data-svc-row]")) : [];
    if (!heads.length) return;

    let raf = 0;
    const pick = () => {
      raf = 0;
      const focal = window.innerHeight * 0.5;
      let next = 0;
      heads.forEach((h, i) => {
        if (h.getBoundingClientRect().top <= focal) next = i;
      });
      setActive(next);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };

    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    /* The stylesheet is compiled in the browser, so that first read can land on
       a page that has not been laid out yet, with every heading stacked at the
       top and therefore already "past" the line. Re-run it whenever the section
       settles into a new size. */
    const ro = new ResizeObserver(onScroll);
    ro.observe(root);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section ref={ref} id="services" className="bg-paper py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <SplitHeading
          as="h2"
          text="Powerful engineering services for your product"
          className="display text-display-lg max-w-[14ch]"
        />

        <div className="mt-16 lg:mt-24 lg:grid lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          {/* The stage. Sticky, so it holds still while the list scrolls past
              it, and absolutely stacked, so swapping service changes nothing
              about the layout — that is the whole reason this is smooth. Every
              scene is mounted; only opacity and a small lift move.

              Sticky needs a containing block taller than itself to have
              anywhere to travel, which is why the wrapper is a plain block
              under lg — a single-column grid would put the stage in a row of
              its own and it would scroll straight off — and why the grid above
              lg is left to stretch its columns rather than align them start. */}
          <div className="mb-12 lg:order-last lg:mb-0">
            <div className="sticky top-[calc(var(--nav-h)+1rem)] bg-paper lg:top-[max(calc(var(--nav-h)+2rem),18vh)]">
              <div className="relative h-56 sm:h-72 lg:h-[26rem]">
                {services.map((s, i) => {
                  const on = active === i;
                  return (
                    <div
                      key={s.num}
                      aria-hidden={!on}
                      style={{
                        opacity: on ? 1 : 0,
                        transform: on ? "translateY(0) scale(1)" : "translateY(18px) scale(0.97)",
                        transitionDelay: on ? "80ms" : "0ms",
                      }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-8 transition-all duration-[550ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                    >
                      <div className="flex w-full flex-1 items-center justify-center px-2">
                        <ServiceScene icon={s.icon} tone={s.tone} />
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {s.tags.map((t) => (
                          <span
                            key={t}
                            className="meta rounded-full border border-line px-3.5 py-2 text-ink/70"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* The list. Generous rows so each one gets a moment of its own on the
              way past, and everything but the active row drops back so the eye
              is told where it is. The tail of padding is what the stage sticks
              against while the last row is the active one — without it the
              stage would come unstuck and drift away before you got there. */}
          <div className="border-t border-line pb-16 lg:pb-[18rem]">
            {services.map((s, i) => {
              const on = active === i;
              return (
                <Reveal key={s.num} from="left" delay={i * 0.09} scaleFrom={1} rotate={0.5} rule>
                  <div
                    data-svc-row
                    className="grid gap-4 py-10 transition-opacity duration-500 sm:py-14 lg:py-[4.5rem]"
                    style={{ opacity: on ? 1 : 0.4 }}
                  >
                    <RevealLayer as="span" from="left" distance={20} className="block">
                      <span className="flex items-baseline gap-4">
                        <span
                          className="meta shrink-0 transition-colors duration-500"
                          style={{ color: on ? s.tone : "rgba(11,11,11,0.35)" }}
                        >
                          {s.num}
                        </span>
                        <span
                          className="display text-display-sm block transition-colors duration-500"
                          style={{ color: on ? s.tone : undefined }}
                        >
                          {s.title}
                        </span>
                      </span>
                    </RevealLayer>
                    <RevealLayer as="span" from="left" delay={0.13} distance={20} className="block">
                      <span className="block max-w-lg text-[14px] leading-[1.7] text-muted-2">
                        {s.blurb}
                      </span>
                    </RevealLayer>
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
