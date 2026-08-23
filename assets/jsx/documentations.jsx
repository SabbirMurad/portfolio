/* global React, ReactDOM, gsap, ScrollTrigger, Lenis, Cursor, Ripple, Reveal, useDocs, DocCard, DocCardSkeletons, DocsEmpty, profile, navLinks, socials */
/*
 * Documentations — the standalone index, in the new design language.
 *
 * Keeps what the old page did (search, category filter, card grid) and drops
 * what it invented: the per-doc view counts were hardcoded figures with nothing
 * behind them.
 *
 * Cards come from GET /api/documentation/feed via useDocs() in
 * assets/jsx/doc_card.jsx — the same hook and the same card component the
 * home page's Docs section renders, so the two can never drift. There is no
 * `category` field on the backend model, so the filter chips are built from
 * the tags actually present across the real entries instead.
 */

const SITE_URL = "https://sabbirhassan.com";
const ALL = "All";

// Skeletons shown while the feed is in flight. The real count is
// unknowable until it answers, so this is just enough to fill the fold.
const LOADING_CARD_COUNT = 6;

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
function DocsHeader() {
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
function DocsFooter() {
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
function Documentations() {
  const { useState, useMemo, useEffect, useRef } = React;
  const { items, state, loading, retry } = useDocs();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const searchRef = useRef(null);

  /* One chip per tag present across the real entries, in the order they're
     first seen — a new doc with a new tag gets a filter for free. */
  const categories = useMemo(() => {
    const seen = [];
    items.forEach((d) => {
      d.tags.forEach((t) => {
        if (seen.indexOf(t) === -1) seen.push(t);
      });
    });
    return [ALL].concat(seen);
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((d) => {
      if (category !== ALL && d.tags.indexOf(category) === -1) return false;
      if (!q) return true;
      const hay = [d.title, d.blurb].concat(d.tags).join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }, [items, query, category]);

  /* The arriving entries and a filter change both change the document
     height, so the reveal triggers below the fold need their positions
     recomputed. */
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [items, query, category]);

  /* "/" focuses the search, the way a docs index usually behaves. */
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
      name: "Technical documentation by " + profile.fullName,
      url: SITE_URL + "/documentations",
      description:
        "Reference material, architecture notes and guides written by " +
        profile.fullName +
        ".",
      inLanguage: "en",
      author: { "@type": "Person", name: profile.fullName, url: SITE_URL + "/" },
      hasPart: items.map((d) => ({
        "@type": "TechArticle",
        name: d.title,
        description: d.blurb,
      })),
    });
    document.head.appendChild(el);
    return () => el.remove();
  }, [items]);

  const filtered = query.trim() !== "" || category !== ALL;

  return (
    <React.Fragment>
      <DocsHeader />

      {/* ── Hero ── */}
      <section
        data-cursor-theme="dark"
        className="bg-ink px-5 pb-14 pt-20 text-white sm:px-8 sm:pb-16 sm:pt-24 lg:px-12 lg:pt-28"
      >
        <div className="mx-auto max-w-[1600px]">
          {/* Heading left, standfirst pinned to its baseline on the right —
              the same header rhythm the home page sections use. */}
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <Reveal distance={26}>
                <p className="meta text-white/50">Documentation</p>
              </Reveal>

              <Reveal delay={0.08} distance={34}>
                <h1 className="display text-display-lg mt-5 max-w-[13ch]">
                  Written guides <span className="text-vermilion">&amp;</span> references
                </h1>
              </Reveal>
            </div>

            <Reveal from="right" delay={0.16} distance={26}>
              <p className="max-w-sm text-[14px] leading-[1.75] text-white/60">
                Reference material, architecture notes and guides — written to be read by whoever
                picks the project up next. Search, or narrow by topic.
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
            <label htmlFor="doc-search" className="sr-only">
              Search documentation
            </label>
            <div className="relative">
              <input
                id="doc-search"
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, topics and tags…"
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

          {/* Filters — chips are built from tags actually present, so they
              only make sense once the feed has answered with something. */}
          {!loading && items.length ? (
            <Reveal delay={0.3} distance={18} className="mt-5 flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = c === category;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={on}
                    className={
                      "meta rounded-full border px-3.5 py-1.5 transition-colors duration-400 " +
                      (on
                        ? "border-vermilion bg-vermilion text-white"
                        : "border-line-dark text-white/60 hover:border-white/35 hover:text-white")
                    }
                  >
                    {c}
                  </button>
                );
              })}
            </Reveal>
          ) : null}
        </div>
      </section>

      {/* ── Grid ── */}
      <main className="bg-bone px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1600px]">
          {/* The count is only meaningful once there is something to count;
              with nothing published the panel below says it in words. */}
          {loading ? (
            <p className="meta" aria-hidden="true">
              <span className="skeleton inline-block h-[11px] w-24 rounded-xs align-middle" />
            </p>
          ) : items.length ? (
            <p className="meta text-muted-2" role="status" aria-live="polite">
              {filtered
                ? shown.length + " of " + items.length + " documents"
                : items.length + " documents"}
            </p>
          ) : null}

          {loading ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <DocCardSkeletons count={LOADING_CARD_COUNT} />
            </div>
          ) : state === "empty" || state === "error" ? (
            <div className="mt-2">
              <DocsEmpty variant={state} onRetry={retry} />
            </div>
          ) : shown.length ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((d, i) => (
                <Reveal
                  key={d.key}
                  delay={(i % 3) * 0.09}
                  scaleFrom={0.97}
                  distance={40}
                  className="h-full"
                >
                  <DocCard d={d} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-sm border border-line bg-paper p-10 text-center sm:p-16">
              <p className="display-tight text-2xl font-bold">Nothing here yet</p>
              <p className="mx-auto mt-3 max-w-sm text-[14px] leading-[1.7] text-muted-2">
                No document matches that search or topic.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory(ALL);
                }}
                className="meta mt-7 rounded-sm bg-ink px-6 py-3 text-white transition-colors duration-400 hover:bg-vermilion"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </main>

      <DocsFooter />
    </React.Fragment>
  );
}

function App() {
  return (
    <React.Fragment>
      <Cursor />
      <Ripple />
      <Documentations />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
