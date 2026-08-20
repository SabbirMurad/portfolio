/* global React, BlurHash, Parallax, RevealLayer, socials */
/*
 * The project card, its loading skeleton, and the fetch that feeds them.
 *
 * Shared by the home page's Projects section (assets/jsx/sections/projects.jsx)
 * and the standalone index (assets/jsx/projects.jsx), which used to hold two
 * copies of the same markup. Loaded by both pages before either of those.
 *
 * Data comes from GET /api/project/feed — public and unauthenticated, see
 * src/handler/project/feed.rs. That is the only source: an empty collection
 * shows the empty state below, never a set of placeholder entries standing in
 * for real work.
 */

/* ── shape ──
   The API speaks title/subtitle/description/image; the card speaks
   name/kind/blurb/image. One place does the translation. */
function _toCard(p) {
  return {
    key: p.uuid,
    name: p.title,
    kind: p.subtitle,
    // `year` is the year of the work. It is optional, so entries without one
    // fall back to when the entry was made — the closest true thing we have.
    year: p.year || String(new Date(p.created_at).getFullYear()),
    blurb: p.description,
    tags: p.tags || [],
    href: p.link || null,
    accent: p.accent || "#DE4520",
    featured: !!p.featured,
    image: p.image ? "/image/webp/" + p.image.id : null,
    blurHash: p.image ? p.image.blur_hash : "",
  };
}

/**
 * Loads the feed.
 * `state` is one of:
 *   "loading" — the request is in flight; render skeletons
 *   "ready"   — entries came back
 *   "empty"   — the request succeeded and there is nothing published
 *   "error"   — the request failed
 * `retry()` re-runs it, for the button on the error state.
 */
function useProjects() {
  const [items, setItems] = React.useState([]);
  const [state, setState] = React.useState("loading");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    setState("loading");

    fetch("/api/project/feed")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((list) => {
        if (!alive) return;
        const rows = Array.isArray(list) ? list.map(_toCard) : [];
        setItems(rows);
        setState(rows.length ? "ready" : "empty");
      })
      .catch((e) => {
        if (!alive) return;
        console.warn("[projects] /api/project/feed failed:", e.message);
        setItems([]);
        setState("error");
      });

    return () => {
      alive = false;
    };
  }, [attempt]);

  return {
    items,
    state,
    loading: state === "loading",
    retry: () => setAttempt((n) => n + 1),
  };
}

/* ── banner ──
   The blurhash sits *over* the image and fades out once the file has decoded,
   rather than the image fading in over it: that way the <img> only ever runs
   its hover transform transition, and there is no frame where neither is
   painted. With no hash (an older upload, or the data.jsx fallback) the
   accent gradient plays the same part. */
function ProjectBanner({ src, hash, accent, name }) {
  const [loaded, setLoaded] = React.useState(false);
  const imgRef = React.useRef(null);

  const placeholder = React.useMemo(
    () => (window.BlurHash ? BlurHash.toDataURL(hash) : null),
    [hash],
  );

  // A file already in cache can finish decoding before React attaches onLoad,
  // which would leave the placeholder sitting over a picture that is there.
  React.useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
  }, [src]);

  return (
    <div className="absolute inset-0 bg-ink">
      <img
        ref={imgRef}
        src={src}
        alt=""
        decoding="async"
        onLoad={() => setLoaded(true)}
        /* A broken file leaves the placeholder up rather than showing the
           browser's own broken-image mark. */
        onError={() => setLoaded(false)}
        className="h-full w-full object-cover object-left transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
      />

      {/* Opacity is set inline rather than through an `opacity-0`/`opacity-100`
          class pair: it belongs with the background it fades, and it is one
          value either way. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-out"
        style={Object.assign(
          { opacity: loaded ? 0 : 1 },
          placeholder
            ? { backgroundImage: "url(" + placeholder + ")" }
            : {
                background:
                  "linear-gradient(145deg, " + accent + ", " + accent + "bb 45%, #0b0b0b)",
              },
        )}
      >
        {/* Without a hash the gradient alone reads as an empty box, so the
            name stands in — the same stand-in the no-banner card uses. */}
        {placeholder ? null : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="display text-[clamp(2rem,4.5vw,3.75rem)] leading-none text-white/20">
              {name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── card ── */
function ProjectCard({ p }) {
  // An entry with no link is still worth showing; it just isn't an anchor.
  const linked = !!p.href;
  const Tag = linked ? "a" : "div";
  const linkProps = linked
    ? {
        href: p.href,
        target: "_blank",
        rel: "noreferrer",
        "data-cursor": "view",
        "data-cursor-label": "VIEW",
      }
    : {};

  return (
    <Tag {...linkProps} className="group block">
      <RevealLayer scaleFrom={1.14} distance={0} className="overflow-hidden rounded-sm">
        <div className="relative h-[200px] overflow-hidden sm:h-[240px] lg:h-[280px]">
          {p.image ? (
            <ProjectBanner src={p.image} hash={p.blurHash} accent={p.accent} name={p.name} />
          ) : (
            <React.Fragment>
              {/* No banner at all: the accent gradient parallaxes instead. */}
              <Parallax amount={22} className="absolute inset-x-0 -inset-y-[14%]">
                <div
                  className="h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  style={{
                    background:
                      "linear-gradient(145deg, " + p.accent + ", " + p.accent + "bb 45%, #0b0b0b)",
                  }}
                />
              </Parallax>

              <Parallax
                amount={-14}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <span className="display text-[clamp(2rem,4.5vw,3.75rem)] leading-none text-white/20">
                  {p.name}
                </span>
              </Parallax>

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            </React.Fragment>
          )}
        </div>
      </RevealLayer>

      <RevealLayer delay={0.12} distance={26}>
        <div className="mt-4 flex items-baseline justify-between gap-4 border-b border-line pb-3">
          <span className="display-tight flex items-center gap-2.5 text-xl font-bold">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: p.accent }}
            />
            {p.name}
            {p.kind ? <span className="meta font-normal text-muted-2">/{p.kind}</span> : null}
          </span>
          <span className="meta shrink-0 text-muted">{p.year}</span>
        </div>
      </RevealLayer>

      <RevealLayer delay={0.22} distance={22}>
        <p className="mt-3 line-clamp-2 max-w-md text-[13.5px] leading-[1.65] text-muted-2">
          {p.blurb}
        </p>
      </RevealLayer>

      <RevealLayer delay={0.32} distance={18}>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.tags.map((t) => (
            <span key={t} className="meta rounded-full border border-line px-2.5 py-1 text-ink/60">
              {t}
            </span>
          ))}
        </div>
      </RevealLayer>
    </Tag>
  );
}

/* ── skeleton ──
   Block-for-block the card's own geometry, so nothing shifts when the real
   entry replaces it. Widths vary by index; identical bars repeated down a
   grid read as a broken layout rather than as loading. */
const _SKELETON_WIDTHS = [
  { name: "8rem", kind: "6rem", blurb: "82%", tags: ["3.5rem", "5rem", "4.25rem"] },
  { name: "6.5rem", kind: "7.5rem", blurb: "68%", tags: ["4.5rem", "3.75rem", "5.5rem"] },
  { name: "9.5rem", kind: "5.5rem", blurb: "76%", tags: ["5rem", "4rem"] },
  { name: "7.5rem", kind: "8rem", blurb: "60%", tags: ["3.75rem", "5.25rem", "4rem"] },
];

function ProjectCardSkeleton({ index = 0 }) {
  const w = _SKELETON_WIDTHS[index % _SKELETON_WIDTHS.length];

  return (
    <div aria-hidden="true">
      <div className="skeleton h-[200px] rounded-sm sm:h-[240px] lg:h-[280px]" />

      <div className="mt-4 flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <span className="flex items-center gap-2.5">
          <span className="skeleton inline-block h-2 w-2 rounded-full" />
          <span className="skeleton inline-block h-[18px] rounded-xs" style={{ width: w.name }} />
          <span className="skeleton inline-block h-[11px] rounded-xs" style={{ width: w.kind }} />
        </span>
        <span className="skeleton inline-block h-[11px] w-9 shrink-0 rounded-xs" />
      </div>

      <div className="mt-3 max-w-md">
        <span className="skeleton block h-[11px] w-full rounded-xs" />
        <span
          className="skeleton mt-2 block h-[11px] rounded-xs"
          style={{ width: w.blurb }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {w.tags.map((width, i) => (
          <span
            key={i}
            className="skeleton inline-block h-[25px] rounded-full"
            style={{ width }}
          />
        ))}
      </div>
    </div>
  );
}

/** A grid's worth of skeletons, matching however many cards will land. */
function ProjectCardSkeletons({ count = 4 }) {
  return (
    <React.Fragment>
      {Array.from({ length: count }, (_, i) => (
        <ProjectCardSkeleton key={i} index={i} />
      ))}
    </React.Fragment>
  );
}

/* ── empty / error state ──
   Stands in place of the whole grid, so it is built at panel scale rather
   than card scale: one framed void the shape of a missing card, then the
   headline, then a single way out.

   `tone` is "light" for the bone/paper pages and "dark" for the ink sections,
   because the same panel has to sit on both. */
const _EMPTY_COPY = {
  empty: {
    eyebrow: "Nothing published",
    heading: "No projects yet",
    body: "Nothing has been published here yet. In the meantime the source for everything I build is on GitHub.",
  },
  error: {
    eyebrow: "Couldn't load",
    heading: "The project feed didn't answer",
    body: "Something went wrong reaching the server. The work is still there — this page just couldn't fetch it.",
  },
};

function ProjectsEmpty({ variant = "empty", onRetry, tone = "light" }) {
  const copy = _EMPTY_COPY[variant] || _EMPTY_COPY.empty;
  const dark = tone === "dark";
  const failed = variant === "error";

  const github = (typeof socials !== "undefined" ? socials : []).find((s) => s.label === "GitHub");

  return (
    <div
      className={
        "rounded-sm border px-6 py-14 text-center sm:px-10 sm:py-20 " +
        (dark ? "border-line-dark bg-ink-2" : "border-line bg-paper")
      }
    >
      {/* The shape of the card that isn't there — same 2.6:1 proportion as a
          project banner, drawn as an outline instead of filled. */}
      <div
        aria-hidden="true"
        className={
          "mx-auto flex h-[72px] w-[188px] items-center justify-center rounded-sm border border-dashed sm:h-[86px] sm:w-[224px] " +
          (dark ? "border-white/15" : "border-ink/15")
        }
      >
        <span
          className={
            "block h-1.5 w-1.5 rounded-full " +
            (failed ? "bg-vermilion" : dark ? "bg-white/25" : "bg-ink/20")
          }
        />
      </div>

      <p className={"meta mt-8 " + (failed ? "text-vermilion" : dark ? "text-white/40" : "text-muted")}>
        {copy.eyebrow}
      </p>

      <h3
        className={
          "display-tight mt-3 text-[clamp(1.5rem,3.2vw,2.25rem)] font-bold " +
          (dark ? "text-white" : "text-ink")
        }
      >
        {copy.heading}
      </h3>

      <p
        className={
          "mx-auto mt-4 max-w-md text-[14px] leading-[1.75] " +
          (dark ? "text-white/55" : "text-muted-2")
        }
      >
        {copy.body}
      </p>

      {/* One way out, never two: retry when the request failed, and otherwise
          the closest real substitute for the work that isn't listed. */}
      {failed ? (
        <button
          type="button"
          onClick={onRetry}
          className={
            "group mt-8 inline-flex items-center gap-3 rounded-sm px-6 py-3.5 transition-colors duration-400 " +
            (dark ? "bg-white text-ink hover:bg-vermilion hover:text-white" : "bg-ink text-white hover:bg-vermilion")
          }
        >
          <span className="meta">Try again</span>
          <span className="inline-block transition-transform duration-400 group-hover:rotate-180">
            ↻
          </span>
        </button>
      ) : github ? (
        <a
          href={github.href}
          target="_blank"
          rel="noreferrer"
          data-cursor="view"
          data-cursor-label="GITHUB"
          className={
            "group mt-8 inline-flex items-center gap-3 rounded-sm px-6 py-3.5 transition-colors duration-400 " +
            (dark ? "bg-white text-ink hover:bg-vermilion hover:text-white" : "bg-ink text-white hover:bg-vermilion")
          }
        >
          <span className="meta">Browse the code on GitHub</span>
          <span className="inline-block transition-transform duration-400 group-hover:translate-x-1">
            ↗
          </span>
        </a>
      ) : null}
    </div>
  );
}
