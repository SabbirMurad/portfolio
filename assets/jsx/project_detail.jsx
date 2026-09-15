/* global React, ReactDOM, gsap, ScrollTrigger, Lenis, Cursor, Ripple, Reveal, RevealLayer, ProjectBanner, profile, navLinks, socials */
/*
 * A project's detail page — /projects/<slug>.
 *
 * The long form of a card: the blurb it already had, then the banner beside
 * the outbound link, the videos, and the titled sections that explain them.
 * That link is the one the card used to point at — a project with a detail
 * page sends people here first and keeps the link on the page, which is the
 * whole point of the page existing.
 *
 * Loads GET /api/project/detail/<slug>. The slug comes from the Tera shell as
 * window.PROJECT_SLUG rather than being parsed out of the URL here. A project
 * without details answers 404 and this renders the not-found panel — the
 * route is public, so anyone can type a slug that was never published.
 */

const SITE_URL = "https://sabbirhassan.com";

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

/* ── data ──
   The one request this page makes. `state` reads the same way as useProjects'
   so the two pages fail in the same language:
     "loading" — in flight
     "ready"   — the project is here
     "missing" — no such project, or it has no detail page (the API's 404)
     "error"   — the request itself failed */
function useProjectDetail(slug) {
  const { useState, useEffect, useCallback } = React;
  const [project, setProject] = useState(null);
  const [state, setState] = useState("loading");
  const [nonce, setNonce] = useState(0);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!slug) {
      setState("missing");
      return;
    }

    let alive = true;
    setState("loading");

    fetch("/api/project/detail/" + encodeURIComponent(slug))
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then((data) => {
        if (!alive) return;
        if (!data) {
          setState("missing");
          return;
        }
        setProject(data);
        setState("ready");
      })
      .catch(() => {
        if (alive) setState("error");
      });

    return () => {
      alive = false;
    };
  }, [slug, nonce]);

  return { project, state, loading: state === "loading", retry };
}

/* ── head ──
   The shell's title and description are generic, because the server doesn't
   know which project this is until the API answers. Once it has, they are
   replaced with the real ones, and a CreativeWork graph is added. Everything
   written here is undone on unmount so nothing leaks between renders. */
function useProjectHead(project) {
  React.useEffect(() => {
    if (!project) return;

    const title = project.title + " — " + profile.fullName;
    const previousTitle = document.title;
    document.title = title;

    const setMeta = (selector, value) => {
      const el = document.head.querySelector(selector);
      if (!el) return null;
      const before = el.getAttribute("content");
      el.setAttribute("content", value);
      return () => el.setAttribute("content", before);
    };

    const restore = [
      setMeta('meta[name="description"]', project.description),
      setMeta('meta[property="og:title"]', title),
      setMeta('meta[property="og:description"]', project.description),
      setMeta('meta[name="twitter:title"]', title),
      setMeta('meta[name="twitter:description"]', project.description),
    ].filter(Boolean);

    const graph = document.createElement("script");
    graph.type = "application/ld+json";
    graph.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: project.title,
      description: project.description,
      about: project.subtitle || undefined,
      url: SITE_URL + "/projects/" + project.slug,
      keywords: project.tags.join(", ") || undefined,
      author: { "@type": "Person", name: profile.fullName, url: SITE_URL + "/" },
      // The outbound link is where the work actually lives.
      sameAs: project.link || undefined,
    });
    document.head.appendChild(graph);

    return () => {
      document.title = previousTitle;
      restore.forEach((undo) => undo());
      graph.remove();
    };
  }, [project]);
}

/* ── chrome ── */
function DetailHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bone/80 backdrop-blur-md">
      {/* The width cap holds the gutter, matching the home page: `mx-auto
          max-w-[1600px]` first, padding inside it. Every block on this page
          does the same, so the bar and the page share one left edge on any
          window — including the wide ones, where the two orders diverge. */}
      <div className="mx-auto flex h-[var(--nav-h)] max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <a href="/" className="display-tight text-[23px] font-bold tracking-tight">
          {profile.name}
          <sup className="ml-0.5 text-[10px]">®</sup>
        </a>
        <a
          href="/projects"
          className="meta group inline-flex items-center gap-2 text-muted-2 transition-colors duration-300 hover:text-ink"
        >
          <span className="inline-block transition-transform duration-400 group-hover:-translate-x-1">
            ←
          </span>
          All projects
        </a>
      </div>
    </header>
  );
}

function DetailFooter() {
  return (
    <footer className="bg-paper py-16">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-8 border-t border-line px-5 pt-10 sm:px-8 lg:px-12">
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

/* ── video ──
   Facade rather than an iframe per video: twenty embeds would pull twenty
   YouTube players into the page. The thumbnail is a still from YouTube's own
   CDN, and the iframe is created on click, with autoplay because by then the
   visitor has asked for it.

   `id` was parsed and validated server-side (utils/youtube.rs), so what goes
   into the src here is an 11-character id, never a pasted URL. */
function VideoEmbed({ id, title }) {
  const { useState } = React;
  const [playing, setPlaying] = useState(false);

  // `title` is not printed — it names the video for the iframe and the
  // thumbnail's alt text, and nothing else.
  return (
    <figure className="group">
      <div className="relative aspect-video overflow-hidden rounded-sm bg-ink">
        {playing ? (
          <iframe
            src={"https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0"}
            title={title || "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            data-cursor="view"
            data-cursor-label="PLAY"
            aria-label={title ? "Play: " + title : "Play video"}
            className="absolute inset-0 h-full w-full"
          >
            <img
              src={"https://i.ytimg.com/vi/" + id + "/maxresdefault.jpg"}
              alt={title || ""}
              loading="lazy"
              /* maxres doesn't exist for every upload; hqdefault always does. */
              onError={(e) => {
                e.currentTarget.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
              }}
              className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-black/20 transition-colors duration-400 group-hover:bg-black/10" />
            <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-vermilion text-white shadow-lg transition-transform duration-400 group-hover:scale-110">
              <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-6 w-6">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>

    </figure>
  );
}

/* ── states ── */
function DetailMessage({ variant, onRetry }) {
  const failed = variant === "error";

  return (
    <main className="bg-bone py-24">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="rounded-sm border border-line bg-paper px-6 py-16 text-center sm:px-10 sm:py-24">
          <p className="meta text-muted">{failed ? "Couldn't load" : "Not found"}</p>
          <p className="display-tight mt-4 text-3xl font-bold">
            {failed ? "This page didn't answer" : "No such project"}
          </p>
          <p className="mx-auto mt-4 max-w-md text-[14px] leading-[1.7] text-muted-2">
            {failed
              ? "Something went wrong reaching the server. The project is still there — this page just couldn't fetch it."
              : "This project either doesn't exist or doesn't have a page of its own. The rest of the work is on the projects page."}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {failed ? (
              <button
                type="button"
                onClick={onRetry}
                className="meta rounded-sm bg-ink px-6 py-3 text-white transition-colors duration-400 hover:bg-vermilion"
              >
                Try again
              </button>
            ) : null}
            <a
              href="/projects"
              className={
                "meta rounded-sm px-6 py-3 transition-colors duration-400 " +
                (failed
                  ? "border border-line text-ink hover:border-ink"
                  : "bg-ink text-white hover:bg-vermilion")
              }
            >
              All projects
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

function DetailSkeleton() {
  return (
    <React.Fragment>
      <section className="bg-ink pb-16 pt-20 lg:pt-28">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          <span className="skeleton block h-[11px] w-24 rounded-xs" />
          <span className="skeleton mt-6 block h-[52px] w-[min(520px,80%)] rounded-xs" />
          <span className="skeleton mt-4 block h-[14px] w-[min(680px,95%)] rounded-xs" />
          <span className="skeleton mt-2 block h-[14px] w-[min(560px,85%)] rounded-xs" />
        </div>
      </section>
      <main className="bg-bone py-16">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          <span className="skeleton block aspect-[2.6/1] w-full rounded-sm" />
        </div>
      </main>
    </React.Fragment>
  );
}

/* ── page ── */
function ProjectDetail() {
  const slug = window.PROJECT_SLUG || "";
  const { project, state, retry } = useProjectDetail(slug);
  useProjectHead(project);

  /* Sections and videos arrive together and both change the page height, so
     the reveals below the fold need their positions recomputed. */
  React.useEffect(() => {
    ScrollTrigger.refresh();
  }, [project]);

  if (state === "loading") {
    return (
      <React.Fragment>
        <DetailHeader />
        <DetailSkeleton />
        <DetailFooter />
      </React.Fragment>
    );
  }

  if (state !== "ready" || !project) {
    return (
      <React.Fragment>
        <DetailHeader />
        <DetailMessage variant={state === "error" ? "error" : "missing"} onRetry={retry} />
        <DetailFooter />
      </React.Fragment>
    );
  }

  const accent = project.accent || "#DE4520";
  const image = project.image ? "/image/webp/" + project.image.id : null;

  return (
    <React.Fragment>
      <DetailHeader />

      {/* ── Banner band ──
          The dark section carries the artwork and nothing else. The banner
          starts on the same gutter as everything else on the page rather than
          bleeding to the window edge, so the ink runs on either side of it,
          and the link sits opposite as a plain button. Everything that used to
          be set over this — name, blurb, tags — reads below it instead. */}
      <section data-cursor-theme="dark" className="relative overflow-hidden bg-ink text-white">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          <div className="grid items-center lg:grid-cols-[1.45fr_1fr]">
            {image ? (
              <RevealLayer scaleFrom={1.06} distance={0}>
                <img
                  src={image}
                  alt={project.subtitle ? project.title + " — " + project.subtitle : project.title}
                  width={project.image.width || undefined}
                  height={project.image.height || undefined}
                  decoding="async"
                  className="block w-full"
                />
              </RevealLayer>
            ) : (
              /* No banner: the accent still has to say which project this is. */
              <div
                className="h-40 w-full lg:h-64"
                style={{
                  background:
                    "linear-gradient(120deg, " + accent + ", " + accent + "55 45%, #0b0b0b)",
                }}
              />
            )}

            {/* Pushed to the gutter on the right, so the button's edge lines
                up with the header's "All projects" and the footer's nav, and
                down to the banner's bottom edge with 18px under it — the
                column stretches to the row's height so "bottom" means the
                picture's bottom, not the button's own box. */}
            <div className="flex pb-14 pt-8 lg:items-end lg:justify-end lg:self-stretch lg:pb-[18px] lg:pl-12 lg:pt-0">
              {project.link ? (
                <Reveal from="right" distance={24} scaleFrom={1}>
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="view"
                    data-cursor-label="OPEN"
                    className="group inline-flex max-w-full items-center gap-3 rounded-sm bg-white px-6 py-3.5 text-ink transition-colors duration-400 hover:bg-vermilion hover:text-white"
                  >
                    <span className="meta truncate">{_hostOf(project.link)}</span>
                    <span className="inline-block transition-transform duration-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                      ↗
                    </span>
                  </a>
                </Reveal>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <main className="bg-bone py-10 sm:py-12 lg:py-14">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
          {/* ── The project itself ──
              The name and the kind are set into the banner artwork above, so
              printing them again here would be saying it twice. The h1 stays
              in the markup but out of sight: a page still needs one heading
              that names it, for a screen reader reading the page in order and
              for anything indexing it, and the picture cannot be that. */}
          <h1 className="sr-only">
            {project.subtitle ? project.title + " — " + project.subtitle : project.title}
          </h1>

          <Reveal distance={26}>
            <p className="max-w-2xl text-[15px] leading-[1.8] text-muted-2">
              {project.description}
            </p>
          </Reveal>

          {project.tags.length ? (
            <Reveal delay={0.12} distance={20}>
              <div className="mt-7 flex flex-wrap gap-1.5">
                {project.tags.map((t) => (
                  <span
                    key={t}
                    className="meta rounded-full border border-line px-2.5 py-1 text-ink/60"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Reveal>
          ) : null}

          {/* ── Videos ──
              Ahead of the prose: seeing the thing work is the fastest way to
              understand it, and the sections below then explain what was just
              watched. No heading — a row of players under a rule reads as
              what it is, and the captions say which is which. */}
          {project.videos.length ? (
            <div className="mt-10 border-t border-line pt-10">
              <div
                className={"grid gap-8 " + (project.videos.length > 1 ? "lg:grid-cols-2" : "")}
              >
                {project.videos.map((v, i) => (
                  <Reveal key={v.id + i} delay={(i % 2) * 0.08} distance={24} scaleFrom={1}>
                    <VideoEmbed id={v.id} title={v.title} />
                  </Reveal>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── Sections ──
              Two-up: the title holds the left column and reads as a margin
              note against its own prose, which keeps a run of them scannable
              in a way stacked headings are not. */}
          {project.sections.length ? (
            <div className="mt-10">
              {project.sections.map((s, i) => (
                <Reveal key={i} delay={0.06} distance={26} scaleFrom={1}>
                  <article className="grid gap-4 border-t border-line py-10 lg:grid-cols-[0.4fr_1fr] lg:gap-16">
                    <h2 className="display-tight text-2xl font-bold lg:text-3xl">{s.title}</h2>
                    {/* Authored as plain text; blank lines are paragraphs. */}
                    <div className="max-w-2xl">
                      {s.body.split(/\n{2,}/).map((para, j) => (
                        <p
                          key={j}
                          className={
                            "text-[15px] leading-[1.8] text-muted-2" + (j ? " mt-4" : "")
                          }
                        >
                          {para}
                        </p>
                      ))}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          ) : null}
        </div>
      </main>

      <DetailFooter />
    </React.Fragment>
  );
}

/* "https://github.com/SabbirMurad/fireball" reads better as
   "github.com/SabbirMurad/fireball" on a button that already says it leaves
   the site. A same-site link keeps its path. */
function _hostOf(link) {
  try {
    const url = new URL(link, SITE_URL);
    return (url.host + url.pathname).replace(/^www\./, "").replace(/\/$/, "");
  } catch (e) {
    return link;
  }
}

function App() {
  return (
    <React.Fragment>
      <Cursor />
      <Ripple />
      <ProjectDetail />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
