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

                      <div className="flex h-56 items-center justify-center px-2 sm:h-64">
                        <ServiceScene icon={s.icon} tone={s.tone} />
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
