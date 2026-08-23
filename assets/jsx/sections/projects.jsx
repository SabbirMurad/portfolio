/* global React, Reveal, SplitHeading, useProjects, ProjectCard, ProjectCardSkeletons, ProjectsEmpty */
/*
 * The home page's projects strip.
 *
 * The card, its skeleton and the fetch all live in assets/jsx/project_card.jsx,
 * shared with the standalone /projects index.
 */

// How many cards the strip shows, and so how many skeletons stand in for them.
const HOME_PROJECT_COUNT = 4;

function Projects() {
  const { items, state, loading, retry } = useProjects();

  const shown = React.useMemo(() => {
    // `featured` is the dashboard's toggle for "put this on the home page".
    // With nothing featured the strip would be empty, which reads as broken
    // rather than as a deliberately short list — so fall back to the newest.
    const featured = items.filter((p) => p.featured);
    const pick = featured.length ? featured : items;
    return pick.slice(0, HOME_PROJECT_COUNT);
  }, [items]);

  return (
    <section id="work" className="bg-bone py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <SplitHeading as="h2" text="My projects." className="display text-display-lg" />
          </div>

          <Reveal from="right" delay={0.1} className="flex flex-col items-end gap-4">
            <p className="max-w-sm text-[14px] leading-[1.75] text-muted-2">
              A selection of work spanning systems programming, mobile apps, and the web — each
              built end to end, from architecture through interface.
            </p>
            <a
              href="/projects"
              data-cursor="view"
              data-cursor-label="WORK"
              className="group inline-flex items-center gap-3 rounded-sm bg-ink px-6 py-3.5 text-white transition-colors duration-400 hover:bg-vermilion"
            >
              <span className="meta">View all projects</span>
              <span className="inline-block transition-transform duration-400 group-hover:translate-x-1">
                →
              </span>
            </a>
          </Reveal>
        </div>

        {/* With nothing to show, the panel replaces the grid rather than
            sitting inside it — a single full-width block reads as a state,
            whereas one panel in a two-column grid reads as a broken card. */}
        {state === "empty" || state === "error" ? (
          <Reveal className="mt-16" distance={26}>
            <ProjectsEmpty variant={state} onRetry={retry} />
          </Reveal>
        ) : (
          <div className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2">
            {loading ? (
              <ProjectCardSkeletons count={HOME_PROJECT_COUNT} />
            ) : (
              shown.map((p, i) => (
                <Reveal
                  key={p.key}
                  from={i % 2 === 0 ? "left" : "right"}
                  delay={(i % 2) * 0.08}
                  scaleFrom={1}
                  rotate={1.4}
                >
                  <ProjectCard p={p} />
                </Reveal>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
