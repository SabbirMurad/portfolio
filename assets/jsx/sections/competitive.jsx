/* global React, Counter, Reveal, RevealLayer, SplitHeading, competitive */
/*
 * Competitive programming — solved counts, a difficulty split, the platforms and
 * the techniques the practice actually trains.
 *
 * Counts come from the LeetCode stats endpoint named in `competitive` (the same
 * one the previous site called). Nothing is invented while that is in flight or
 * unavailable: figures render as em dashes and the difficulty bar stays a flat
 * track, then fills once real numbers land.
 */
function Competitive() {
  const [solved, setSolved] = React.useState(competitive.solved);

  React.useEffect(() => {
    let alive = true;
    fetch(competitive.endpoint)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        setSolved({
          easy: d.easySolved != null ? d.easySolved : null,
          medium: d.mediumSolved != null ? d.mediumSolved : null,
          hard: d.hardSolved != null ? d.hardSolved : null,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const counted = competitive.difficulties
    .map((d) => solved[d.key])
    .filter((n) => typeof n === "number");
  const total = counted.length ? counted.reduce((a, b) => a + b, 0) : null;

  return (
    <section id="competitive" className="bg-paper py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <SplitHeading
              as="h2"
              text="Problem solving against the clock"
              className="display text-display-lg max-w-[12ch]"
              accentWords={[1]}
            />
          </div>

          <Reveal from="right" delay={0.1}>
            <p className="max-w-sm text-[14px] leading-[1.75] text-muted-2">
              Contest practice is where the systems instinct comes from — the habit of reaching for
              the right structure before writing the first line.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          {/* ── Solved + difficulty split ── */}
          <Reveal from="left" scaleFrom={1} distance={40} className="h-full">
            <div className="flex h-full flex-col rounded-sm border border-line bg-bone p-7 sm:p-9">
              <RevealLayer distance={22}>
                <p className="meta text-muted-2">Problems solved</p>
                <p className="display-tight mt-3 text-6xl font-bold sm:text-7xl">
                  {total != null ? <Counter to={total} suffix="+" /> : "—"}
                </p>
              </RevealLayer>

              <RevealLayer delay={0.14} distance={18} className="mt-9">
                <div
                  className="flex h-2.5 w-full overflow-hidden rounded-full bg-line"
                  role="img"
                  aria-label={
                    total != null
                      ? `${total} problems solved, split by difficulty`
                      : "Difficulty split unavailable"
                  }
                >
                  {competitive.difficulties.map((d) => {
                    const n = solved[d.key];
                    const pct = total && typeof n === "number" ? (n / total) * 100 : 0;
                    return (
                      <span
                        key={d.key}
                        className="h-full transition-[width] duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{ width: pct + "%", background: d.tone }}
                      />
                    );
                  })}
                </div>
              </RevealLayer>

              <RevealLayer
                delay={0.22}
                distance={16}
                className="mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-sm bg-line"
              >
                {competitive.difficulties.map((d) => (
                  <div key={d.key} className="bg-bone py-5 pr-4">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ background: d.tone }}
                      />
                      <span className="meta text-muted-2">{d.label}</span>
                    </span>
                    <p className="display-tight mt-2 text-3xl font-bold">
                      {typeof solved[d.key] === "number" ? solved[d.key] : "—"}
                    </p>
                  </div>
                ))}
              </RevealLayer>
            </div>
          </Reveal>

          {/* ── Platforms + techniques ── */}
          <Reveal from="right" delay={0.12} scaleFrom={1} distance={40} className="h-full">
            <div className="flex h-full flex-col">
              <RevealLayer distance={20}>
                <p className="meta text-muted-2">Where I compete</p>
              </RevealLayer>

              <div className="mt-4 border-t border-line">
                {competitive.platforms.map((p, i) => {
                  const inner = (
                    <React.Fragment>
                      <span className="flex items-center gap-3">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: p.tone }}
                        />
                        <span className="display-tight text-xl font-bold transition-colors duration-400 group-hover:text-vermilion">
                          {p.name}
                        </span>
                      </span>
                      {p.handle ? (
                        <span className="meta shrink-0 text-muted-2">{p.handle}</span>
                      ) : null}
                    </React.Fragment>
                  );
                  return (
                    <RevealLayer key={p.name} delay={0.1 + i * 0.08} distance={16}>
                      {p.href ? (
                        <a
                          href={p.href}
                          target="_blank"
                          rel="noreferrer"
                          data-cursor="view"
                          data-cursor-label="VIEW"
                          className="group flex items-baseline justify-between gap-4 border-b border-line py-5 transition-colors duration-500 hover:border-ink/25"
                        >
                          {inner}
                        </a>
                      ) : (
                        <div className="group flex items-baseline justify-between gap-4 border-b border-line py-5">
                          {inner}
                        </div>
                      )}
                    </RevealLayer>
                  );
                })}
              </div>

              <RevealLayer delay={0.3} distance={18} className="mt-9">
                <p className="meta text-muted-2">What it sharpens</p>
              </RevealLayer>

              <RevealLayer delay={0.36} distance={14} className="mt-4 flex flex-wrap gap-1.5">
                {competitive.topics.map((t) => (
                  <span
                    key={t}
                    className="meta rounded-full border border-line px-2.5 py-1 text-ink/60"
                  >
                    {t}
                  </span>
                ))}
              </RevealLayer>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
