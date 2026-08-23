/* global React, RevealLayer, socials */
/*
 * The documentation card, its loading skeleton, the empty/error panel, and
 * the fetch that feeds them.
 *
 * Shared by the home page's Docs section (assets/jsx/sections/docs.jsx) and
 * the standalone index (assets/jsx/documentations.jsx), same reasoning as
 * assets/jsx/project_card.jsx for projects. Loaded by both pages before
 * either of those.
 *
 * Data comes from GET /api/documentation/feed — public and unauthenticated,
 * see src/handler/documentation/feed.rs. That is the only source: an empty
 * collection shows the empty state below, never a set of placeholder entries
 * standing in for real writing.
 */

/* ── shape ──
   The API speaks name/description; the card speaks title/blurb. One place
   does the translation. There is no `category` field on the backend model —
   `tags` is the only grouping a real entry has, so the standalone page's
   filter chips are built from tags rather than a dedicated category. */
function _toDocCard(d) {
  return {
    key: d.uuid,
    title: d.name,
    blurb: d.description,
    tags: d.tags || [],
    href: "/documentation/" + d.uuid + "/",
    featured: !!d.featured,
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
function useDocs() {
  const [items, setItems] = React.useState([]);
  const [state, setState] = React.useState("loading");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    setState("loading");

    fetch("/api/documentation/feed")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((list) => {
        if (!alive) return;
        const rows = Array.isArray(list) ? list.map(_toDocCard) : [];
        setItems(rows);
        setState(rows.length ? "ready" : "empty");
      })
      .catch((e) => {
        if (!alive) return;
        console.warn("[docs] /api/documentation/feed failed:", e.message);
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

/* ── card ── */
function DocCard({ d }) {
  return (
    <a
      href={d.href}
      target="_blank"
      rel="noreferrer"
      data-cursor="view"
      data-cursor-label="READ"
      className="group flex h-full flex-col rounded-sm border border-line bg-bone p-6 transition-colors duration-500 hover:border-ink/25 sm:p-7"
    >
      <RevealLayer distance={20}>
        <h3 className="display-tight text-xl font-bold leading-tight transition-colors duration-400 group-hover:text-vermilion">
          {d.title}
        </h3>
      </RevealLayer>

      <RevealLayer delay={0.08} distance={18}>
        <p className="mt-3 text-[13.5px] leading-[1.7] text-muted-2">{d.blurb}</p>
      </RevealLayer>

      <RevealLayer delay={0.16} distance={14} className="mt-5 flex flex-wrap gap-1.5">
        {d.tags.map((t) => (
          <span key={t} className="meta rounded-full border border-line px-2.5 py-1 text-ink/60">
            {t}
          </span>
        ))}
      </RevealLayer>

      <RevealLayer
        delay={0.24}
        distance={12}
        className="mt-auto flex items-center justify-end gap-2 pt-7 text-muted-2 transition-colors duration-400 group-hover:text-vermilion"
      >
        <span className="meta">View details</span>
        <span className="transition-transform duration-400 group-hover:translate-x-1">→</span>
      </RevealLayer>
    </a>
  );
}

/* ── skeleton ──
   Block-for-block the card's own geometry, so nothing shifts when the real
   entry replaces it. Widths vary by index, same reasoning as
   project_card.jsx's skeleton. */
const _DOC_SKELETON_WIDTHS = [
  { title: "8rem", blurb: "88%", tags: ["3.5rem", "5rem", "4.25rem"] },
  { title: "10rem", blurb: "70%", tags: ["4.5rem", "3.75rem"] },
  { title: "6.5rem", blurb: "78%", tags: ["5rem", "4rem", "3.5rem"] },
];

function DocCardSkeleton({ index = 0 }) {
  const w = _DOC_SKELETON_WIDTHS[index % _DOC_SKELETON_WIDTHS.length];

  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col rounded-sm border border-line bg-bone p-6 sm:p-7"
    >
      <span className="skeleton inline-block h-[22px] rounded-xs" style={{ width: w.title }} />

      <div className="mt-3 max-w-md">
        <span className="skeleton block h-[11px] w-full rounded-xs" />
        <span className="skeleton mt-2 block h-[11px] rounded-xs" style={{ width: w.blurb }} />
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {w.tags.map((width, i) => (
          <span key={i} className="skeleton inline-block h-[25px] rounded-full" style={{ width }} />
        ))}
      </div>

      <div className="mt-auto flex items-center justify-end gap-2 pt-7">
        <span className="skeleton inline-block h-[11px] w-20 rounded-xs" />
      </div>
    </div>
  );
}

/** A grid's worth of skeletons, matching however many cards will land. */
function DocCardSkeletons({ count = 6 }) {
  return (
    <React.Fragment>
      {Array.from({ length: count }, (_, i) => (
        <DocCardSkeleton key={i} index={i} />
      ))}
    </React.Fragment>
  );
}

/* ── empty / error state ──
   Same panel-scale treatment as project_card.jsx's ProjectsEmpty: one void
   the shape of a missing card, then the headline, then a single way out.
   Docs only ever sits on bone/paper, so unlike ProjectsEmpty there is no
   dark-tone variant to carry. */
const _DOC_EMPTY_COPY = {
  empty: {
    eyebrow: "Nothing published",
    heading: "No documentation yet",
    body: "Nothing has been published here yet. In the meantime the source for everything I write is on GitHub.",
  },
  error: {
    eyebrow: "Couldn't load",
    heading: "The docs feed didn't answer",
    body: "Something went wrong reaching the server. The writing is still there — this page just couldn't fetch it.",
  },
};

function DocsEmpty({ variant = "empty", onRetry }) {
  const copy = _DOC_EMPTY_COPY[variant] || _DOC_EMPTY_COPY.empty;
  const failed = variant === "error";
  const github = (typeof socials !== "undefined" ? socials : []).find((s) => s.label === "GitHub");

  return (
    <div className="rounded-sm border border-line bg-paper px-6 py-14 text-center sm:px-10 sm:py-20">
      <div
        aria-hidden="true"
        className="mx-auto flex h-[72px] w-[188px] items-center justify-center rounded-sm border border-dashed border-ink/15 sm:h-[86px] sm:w-[224px]"
      >
        <span
          className={"block h-1.5 w-1.5 rounded-full " + (failed ? "bg-vermilion" : "bg-ink/20")}
        />
      </div>

      <p className={"meta mt-8 " + (failed ? "text-vermilion" : "text-muted")}>{copy.eyebrow}</p>

      <h3 className="display-tight mt-3 text-[clamp(1.5rem,3.2vw,2.25rem)] font-bold text-ink">
        {copy.heading}
      </h3>

      <p className="mx-auto mt-4 max-w-md text-[14px] leading-[1.75] text-muted-2">{copy.body}</p>

      {failed ? (
        <button
          type="button"
          onClick={onRetry}
          className="group mt-8 inline-flex items-center gap-3 rounded-sm bg-ink px-6 py-3.5 text-white transition-colors duration-400 hover:bg-vermilion"
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
          className="group mt-8 inline-flex items-center gap-3 rounded-sm bg-ink px-6 py-3.5 text-white transition-colors duration-400 hover:bg-vermilion"
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
