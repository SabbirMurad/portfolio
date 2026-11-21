/* global React, ReactDOM, gsap, ScrollTrigger, Lenis,
   Loader, Cursor, Ripple, Nav, Footer, StackSection,
   Hero, Stack, Impact, Services, Projects, Docs, Youtube, Competitive, Process, Journey,
   Testimonials, Faq, Contact, competitive */
/*
 * Entry — boots the scroll stack (GSAP + ScrollTrigger + Lenis, all CDN
 * globals) and mounts the composed app into #root. Loaded last, after data,
 * helpers and every section, so all referenced globals are in scope.
 */

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

gsap.registerPlugin(ScrollTrigger);

if (!prefersReduced) {
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.8,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.4 });
  });
}

// Order matters: index drives the stacking z-order so each section paints over
// the one before it as it slides into place. Stack (first after the hero) is
// `flush`; the hero is `first`. Both are pinned (no slide).
const sections = [
  { id: "stack", C: Stack, flush: true },
  { id: "impact", C: Impact },
  { id: "services", C: Services },
  { id: "projects", C: Projects },
  { id: "docs", C: Docs },
  // These two render only once their API has returned something real (see
  // App) — no placeholder videos, no em-dash counters.
  { id: "youtube", C: Youtube, data: "youtube" },
  { id: "competitive", C: Competitive, data: "leetcode" },
  { id: "process", C: Process },
  { id: "journey", C: Journey },
  { id: "testimonials", C: Testimonials },
  { id: "faq", C: Faq },
  { id: "contact", C: Contact },
];

/* GET a JSON endpoint once. undefined while in flight, null on any failure. */
function useJson(url) {
  const [data, setData] = React.useState(undefined);
  React.useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

function App() {
  const yt = useJson("/api/youtube/feed");
  const lc = useJson(competitive.endpoint);

  const data = {
    youtube: yt && yt.channel && Array.isArray(yt.videos) && yt.videos.length ? yt : null,
    leetcode:
      lc && ["easySolved", "mediumSolved", "hardSolved"].some((k) => typeof lc[k] === "number")
        ? lc
        : null,
  };
  const visible = sections.filter((s) => !s.data || data[s.data]);

  // A section arriving after first paint moves everything below it, so every
  // ScrollTrigger's start/end has to be measured again.
  const shown = visible.map((s) => s.id).join(",");
  React.useEffect(() => {
    ScrollTrigger.refresh();
  }, [shown]);

  return (
    <React.Fragment>
      <Loader />
      <Cursor />
      <Ripple />
      <Nav />

      <main className="relative">
        <StackSection index={0} first={true}>
          <Hero />
        </StackSection>

        {visible.map((s, i) => (
          <StackSection key={s.id} index={i + 1} flush={s.flush === true}>
            <s.C data={s.data ? data[s.data] : undefined} />
          </StackSection>
        ))}
      </main>

      <Footer />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
