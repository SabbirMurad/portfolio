/* global React, ReactDOM, gsap, ScrollTrigger, Lenis, Cursor, Ripple, Reveal, useProjects, ProjectCard, ProjectCardSkeletons, ProjectsEmpty, profile, navLinks, socials */
/*
 * Projects — the standalone index, in the new design language.
 *
 * Mirrors pages/documentations.html's structure and behaviour (header,
 * search, footer, CollectionPage JSON-LD). No category chips here: unlike
 * `docs`, each entry's `kind` is effectively unique rather than a shared
 * bucket, so a filter row would just duplicate the search box.
 *
 * Cards come from GET /api/project/feed via useProjects() in
 * assets/jsx/project_card.jsx — the same hook and the same card component the
 * home page's Projects section renders, so the two can never drift.
 */

const SITE_URL = "https://sabbirhassan.com";

// Skeletons shown while the feed is in flight. The real count is
// unknowable until it answers, so this is just enough to fill the fold.
const LOADING_CARD_COUNT = 4;

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
function ProjectsHeader() {
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

/* ── Footer ──
   The shared Footer's nav links are in-page hashes built for the home page;
   from here they need the leading slash to resolve. */
function ProjectsFooter() {
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
function Projects() {
  const { useState, useMemo, useEffect, useRef } = React;
  const { items, state, loading, retry } = useProjects();
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => {
      const hay = [p.name, p.kind, p.blurb].concat(p.tags).join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }, [items, query]);

  /* Both the arriving entries and a filter change the document height, so the
     reveal triggers below the fold need their positions recomputed. */
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [items, query]);

  /* "/" focuses the search, the way an index page usually behaves. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      e.preventDefault();
      searchRef.current && searchRef.current.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* A CollectionPage graph listing the real entries. Built here rather than in
     the Tera head because the entries only exist once the feed has answered;
     the page is client-rendered either way. Skipped when there is nothing to
     list — an empty `hasPart` is worse than no graph at all. */
  useEffect(() => {
    if (!items.length) return;

    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Projects by " + profile.fullName,
      url: SITE_URL + "/projects",
      description:
        "A selection of work spanning systems programming, mobile apps and the web, built end to end by " +
        profile.fullName +
        ".",
      inLanguage: "en",
      author: { "@type": "Person", name: profile.fullName, url: SITE_URL + "/" },
      hasPart: items.map((p) => ({
        "@type": "CreativeWork",
        name: p.name,
        description: p.blurb,
        about: p.kind,
        url: p.href || undefined,
      })),
    });
    document.head.appendChild(el);
    return () => el.remove();
  }, [items]);

  const filtered = query.trim() !== "";

  return (
    <React.Fragment>
      <ProjectsHeader />

      {/* ── Hero ── */}
      <section
        data-cursor-theme="dark"
        className="bg-ink px-5 pb-14 pt-20 text-white sm:px-8 sm:pb-16 sm:pt-24 lg:px-12 lg:pt-28"
      >
        <div className="mx-auto max-w-[1600px]">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <Reveal distance={26}>
                <p className="meta text-white/50">Projects</p>
              </Reveal>

              <Reveal delay={0.08} distance={34}>
                <h1 className="display text-display-lg mt-5 max-w-[13ch]">
                  Selected <span className="text-vermilion">work</span>
                </h1>
              </Reveal>
            </div>

            <Reveal from="right" delay={0.16} distance={26}>
              <p className="max-w-sm text-[14px] leading-[1.75] text-white/60">
                A selection of work spanning systems programming, mobile apps, and the web — each
                built end to end, from architecture through interface.
              </p>
            </Reveal>
          </div>

          {/* Search — hidden once we know there is nothing to search. It stays
              up while loading so the hero doesn't reflow in the common case. */}
          <Reveal
            delay={0.24}
            distance={22}
            className={"mt-12 max-w-xl " + (!loading && !items.length ? "hidden" : "")}
          >
            <label htmlFor="project-search" className="sr-only">
              Search projects
            </label>
            <div className="relative">
              <input
                id="project-search"
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search names, kinds and tags…"
                className="w-full rounded-sm border border-line-dark bg-ink-2 px-4 py-3.5 pr-24 text-[14px] text-white outline-none transition-colors duration-300 placeholder:text-muted focus:border-white/40"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="meta absolute inset-y-0 right-0 px-4 text-white/50 transition-colors duration-300 hover:text-white"
                >
                  Clear
                </button>
              ) : (
                <span
                  aria-hidden="true"
                  className="meta pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/30"
                >
                  /
                </span>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Grid ── */}
      <main className="bg-bone px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1600px]">
          {/* The count is only meaningful once there is something to count;
              with nothing published the panel below says it in words. */}
          {loading ? (
            /* Kept inside a `.meta` paragraph so the line box is the same
               height as the count it stands in for — otherwise the grid
               below shifts when the feed lands. */
            <p className="meta" aria-hidden="true">
              <span className="skeleton inline-block h-[11px] w-24 rounded-xs align-middle" />
            </p>
          ) : items.length ? (
            <p className="meta text-muted-2" role="status" aria-live="polite">
              {filtered
                ? shown.length + " of " + items.length + " projects"
                : items.length + " projects"}
            </p>
          ) : null}

          {loading ? (
            <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2">
              <ProjectCardSkeletons count={LOADING_CARD_COUNT} />
            </div>
          ) : state === "empty" || state === "error" ? (
            <div className="mt-2">
              <ProjectsEmpty variant={state} onRetry={retry} />
            </div>
          ) : shown.length ? (
            <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2">
              {shown.map((p, i) => (
                <Reveal
                  key={p.key}
                  from={i % 2 === 0 ? "left" : "right"}
                  delay={(i % 2) * 0.08}
                  scaleFrom={1}
                  rotate={1.4}
                >
                  <ProjectCard p={p} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-sm border border-line bg-paper p-10 text-center sm:p-16">
              <p className="display-tight text-2xl font-bold">Nothing here yet</p>
              <p className="mx-auto mt-3 max-w-sm text-[14px] leading-[1.7] text-muted-2">
                No project matches that search.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="meta mt-7 rounded-sm bg-ink px-6 py-3 text-white transition-colors duration-400 hover:bg-vermilion"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </main>

      <ProjectsFooter />
    </React.Fragment>
  );
}

function App() {
  return (
    <React.Fragment>
      <Cursor />
      <Ripple />
      <Projects />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
