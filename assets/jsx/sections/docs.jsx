/* global React, Reveal, SplitHeading, useDocs, DocCard, DocCardSkeletons, DocsEmpty */
/*
 * The home page's documentation strip.
 *
 * The card, its skeleton and the fetch all live in assets/jsx/doc_card.jsx,
 * shared with the standalone /documentations index.
 */

// How many cards the strip shows, and so how many skeletons stand in for them.
const HOME_DOC_COUNT = 6;

function Docs() {
  const { items, state, loading, retry } = useDocs();

  const shown = React.useMemo(() => {
    // `featured` is the dashboard's toggle for "put this on the home page".
    // With nothing featured the strip would be empty, which reads as broken
    // rather than as a deliberately short list — so fall back to the newest.
    const featured = items.filter((d) => d.featured);
    const pick = featured.length ? featured : items;
    return pick.slice(0, HOME_DOC_COUNT);
  }, [items]);

  return (
    <section id="docs" className="bg-paper py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <SplitHeading
              as="h2"
              text="Documentation I write"
              className="display text-display-lg max-w-[11ch]"
            />
          </div>

          <Reveal from="right" delay={0.1} className="flex flex-col items-end gap-4">
            <p className="max-w-sm text-[14px] leading-[1.75] text-muted-2">
              Reference material, architecture notes and guides — written to be read by whoever
              picks the project up next.
            </p>
            <a
              href="/documentations"
              data-cursor="view"
              data-cursor-label="DOCS"
              className="group inline-flex items-center gap-3 rounded-sm bg-ink px-6 py-3.5 text-white transition-colors duration-400 hover:bg-vermilion"
            >
              <span className="meta">View all documentation</span>
              <span className="inline-block transition-transform duration-400 group-hover:translate-x-1">
                →
              </span>
            </a>
          </Reveal>
        </div>

        {/* With nothing to show, the panel replaces the grid rather than
            sitting inside it — same reasoning as the projects strip. */}
        {state === "empty" || state === "error" ? (
          <Reveal className="mt-16" distance={26}>
            <DocsEmpty variant={state} onRetry={retry} />
          </Reveal>
        ) : (
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <DocCardSkeletons count={HOME_DOC_COUNT} />
            ) : (
              shown.map((d, i) => (
                <Reveal key={d.key} delay={(i % 3) * 0.09} scaleFrom={0.97} distance={40} className="h-full">
                  <DocCard d={d} />
                </Reveal>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
