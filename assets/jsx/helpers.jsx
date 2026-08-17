/* global React, gsap, ScrollTrigger */
/*
 * Shared components — build-less ports of the Next helpers.
 * framer-motion's scroll-linked primitives are re-expressed with GSAP +
 * ScrollTrigger. All globals: loaded before the sections that use them.
 */

/* ── slide geometry (was lib/layout.ts) ── */
const SECTION_SLIDE = 56;
const SECTION_SEAL = 10;
const SECTION_OVERLAP = SECTION_SLIDE + SECTION_SEAL;

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── entrance shared by Reveal / RevealLayer ──
   A scroll-triggered "from" tween: the element starts offset/faded and settles
   as it enters the viewport, staggered by `delay` (kept in the same 0–1 units
   the Next version used, scaled to seconds here). */
function _revealEntrance(el, opts) {
  if (!el || reducedMotion()) return () => {};
  const {
    from = "bottom",
    distance = 44,
    delay = 0,
    scaleFrom = 0.94,
    rotate = 0,
    rule = false,
  } = opts || {};

  const ctx = gsap.context(() => {
    const vars = {
      opacity: 0,
      scale: scaleFrom,
      rotation: from === "left" ? -rotate : rotate,
      duration: 0.9,
      delay: delay * 0.9,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" },
    };
    if (from === "bottom") vars.y = distance;
    else vars.x = from === "left" ? -distance : distance;
    gsap.from(el, vars);

    if (rule) {
      const r = el.querySelector("[data-rule]");
      if (r)
        gsap.from(r, {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 0.9,
          delay: delay * 0.9,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" },
        });
    }
  }, el);
  return () => ctx.revert();
}

function Reveal(props) {
  const { children, className = "", rule = false, as = "div" } = props;
  const ref = React.useRef(null);
  React.useEffect(
    () =>
      _revealEntrance(ref.current, {
        from: props.from,
        distance: props.distance,
        delay: props.delay,
        scaleFrom: props.scaleFrom,
        rotate: props.rotate,
        rule,
      }),
    [],
  );
  const Tag = as;
  return (
    <Tag ref={ref} className={(rule ? "relative " : "") + className}>
      {children}
      {rule ? (
        <span
          data-rule
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-line"
        />
      ) : null}
    </Tag>
  );
}

function RevealLayer(props) {
  const { children, className = "", as = "div" } = props;
  const ref = React.useRef(null);
  React.useEffect(
    () =>
      _revealEntrance(ref.current, {
        from: props.from,
        distance: props.distance,
        delay: props.delay,
        scaleFrom: props.scaleFrom,
        rotate: props.rotate,
      }),
    [],
  );
  const Tag = as;
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/* ── SplitHeading ──
   Words resolve one by one as the heading scrolls in: muted+blurred → ink+sharp,
   scrubbed to the scroll position so a heading caught mid-way sits two-tone. */
function SplitHeading(props) {
  const {
    text,
    as = "h2",
    className = "",
    ink = "#0b0b0b",
    muted = "#b4b1ad",
    accentWords = [],
    accent = "#de4520",
  } = props;
  const ref = React.useRef(null);
  const words = text.split(" ");

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = el.querySelectorAll("[data-word]");
    const isAccent = (i) => accentWords.indexOf(i) !== -1;

    if (reducedMotion()) {
      spans.forEach((s, i) => {
        s.style.color = isAccent(i) ? accent : ink;
        s.style.opacity = 1;
        s.style.setProperty("--rblur", "0px");
        s.style.transform = "none";
      });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        spans,
        { color: muted, opacity: 0.45, y: "0.14em", "--rblur": "7px" },
        {
          color: (i) => (isAccent(i) ? accent : ink),
          opacity: 1,
          y: "0em",
          "--rblur": "0px",
          ease: "none",
          stagger: 0.3,
          scrollTrigger: { trigger: el, start: "top 90%", end: "top 35%", scrub: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  const Tag = as;
  return (
    <Tag ref={ref} className={className}>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span
            data-word
            className="inline-block"
            style={{ color: muted, filter: "blur(var(--rblur, 0px))" }}
          >
            {w}
          </span>
          {i < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </Tag>
  );
}

/* ── Parallax ── continuous depth drift: +amount on entry through −amount on exit. */
function Parallax(props) {
  const { children, className = "", amount = 40, axis = "y" } = props;
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      const fromV = axis === "y" ? { y: amount } : { x: amount };
      const toV = axis === "y" ? { y: -amount } : { x: -amount };
      gsap.fromTo(el, fromV, {
        ...toV,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
      });
    }, el);
    return () => ctx.revert();
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* ── Counter ── count up once, when it scrolls into view. */
function Counter(props) {
  const { to, suffix = "", duration = 1900 } = props;
  const ref = React.useRef(null);
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      if (reducedMotion()) {
        setVal(to);
        return;
      }
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        setVal(Math.round(eased * to));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { rootMargin: "-15% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

/* ── StackSection ── each section slides up over the one before and casts a
   fading shadow as it lands. The hero (first) and the section right after it
   (flush) are pinned — no slide. */
function StackSection(props) {
  const { children, index, first = false, flush = false } = props;
  const pinned = first || flush;
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || pinned || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: SECTION_SLIDE, boxShadow: "0px -34px 60px -18px rgba(11,11,11,0.30)" },
        {
          y: 0,
          boxShadow: "0px 0px 0px 0px rgba(11,11,11,0)",
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "top center", scrub: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);
  return (
    <div
      ref={ref}
      className="relative"
      style={{
        zIndex: index,
        marginTop: pinned ? 0 : -SECTION_OVERLAP,
        "--section-overlap": SECTION_OVERLAP + "px",
      }}
    >
      {children}
    </div>
  );
}

/* ── Custom cursor ── ring + dot follow via gsap.quickTo; state via data attrs. */
function Cursor() {
  const ringRef = React.useRef(null);
  const dotRef = React.useRef(null);
  const [active, setActive] = React.useState(false);
  const [label, setLabel] = React.useState(null);
  const [onDark, setOnDark] = React.useState(false);
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) {
      document.body.classList.remove("custom-cursor");
      return;
    }
    setEnabled(true);
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    const rx = gsap.quickTo(ringRef.current, "x", { duration: 0.35, ease: "power3" });
    const ry = gsap.quickTo(ringRef.current, "y", { duration: 0.35, ease: "power3" });
    const dx = gsap.quickTo(dotRef.current, "x", { duration: 0.12, ease: "power3" });
    const dy = gsap.quickTo(dotRef.current, "y", { duration: 0.12, ease: "power3" });
    const onMove = (e) => {
      rx(e.clientX);
      ry(e.clientY);
      dx(e.clientX);
      dy(e.clientY);
      const t = e.target;
      setOnDark(!!(t.closest && t.closest('[data-cursor-theme="dark"]')));
      const el = t.closest && t.closest("[data-cursor], a, button");
      if (!el) {
        setActive(false);
        setLabel(null);
        return;
      }
      setActive(true);
      setLabel(el.dataset.cursorLabel || null);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [enabled]);

  if (!enabled) return null;
  const ink = onDark ? "255,255,255" : "11,11,11";
  const size = active ? (label ? 84 : 52) : 34;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] hidden md:block">
      <div ref={ringRef} className="absolute left-0 top-0">
        <div
          className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border"
          style={{
            width: size,
            height: size,
            transition: "width .28s, height .28s, background-color .28s, border-color .28s",
            backgroundColor: label
              ? "rgba(222,69,32,1)"
              : active
                ? "rgba(" + ink + ",0.1)"
                : "rgba(" + ink + ",0)",
            borderColor: label ? "rgba(222,69,32,0)" : "rgba(" + ink + ",0.4)",
          }}
        >
          {label ? <span className="meta text-[9px] font-semibold text-white">{label}</span> : null}
        </div>
      </div>
      <div ref={dotRef} className="absolute left-0 top-0">
        <div
          className="h-[5px] w-[5px] rounded-full"
          style={{
            backgroundColor: "rgb(" + ink + ")",
            transform: "translate(-50%,-50%) scale(" + (active ? 0 : 1) + ")",
            transition: "transform .28s, background-color .28s",
          }}
        />
      </div>
    </div>
  );
}

/* ── Social brand marks (was SocialIcon.tsx) ── */
const SOCIAL_MARKS = {
  GitHub: {
    viewBox: "0 0 24 24",
    className: "h-5 w-5",
    d: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
  YouTube: {
    viewBox: "0 0 24 24",
    className: "h-5 w-5",
    d: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  Fiverr: {
    viewBox: "0 8.2 24 7.6",
    className: "w-[22px]",
    d: "M23.004 15.588a.995.995 0 1 0 .002-1.99.995.995 0 0 0-.002 1.99zm-.996-3.705h-.85c-.546 0-.84.41-.84 1.092v2.466h-1.61v-3.558h-.684c-.547 0-.84.41-.84 1.092v2.466h-1.61v-4.874h1.61v.74c.264-.574.626-.74 1.163-.74h1.972v.74c.264-.574.625-.74 1.162-.74h.527v1.316zm-6.786 1.501h-3.359c.088.546.43.858 1.006.858.43 0 .732-.175.83-.487l1.425.4c-.351.848-1.22 1.364-2.255 1.364-1.748 0-2.549-1.355-2.549-2.515 0-1.14.703-2.505 2.45-2.505 1.856 0 2.471 1.384 2.471 2.408 0 .224-.01.37-.02.477zm-1.562-.945c-.04-.42-.342-.81-.889-.81-.508 0-.81.225-.908.81h1.797zM7.508 15.44h1.416l1.767-4.874h-1.62l-.86 2.837-.878-2.837H5.72l1.787 4.874zm-6.6 0H2.51v-3.558h1.524v3.558h1.591v-4.874H2.51v-.302c0-.332.235-.536.606-.536h.918V8.412H2.85c-1.162 0-1.943.712-1.943 1.755v.4H0v1.316h.908v3.558z",
  },
  Upwork: {
    viewBox: "0 0 24 24",
    className: "h-5 w-5",
    d: "M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06 1.492 0 2.703 1.212 2.703 2.703-.001 1.489-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.22-1.834-2.148-4.036-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.548-1.405-.002-2.543-1.143-2.545-2.548V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.229 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z",
  },
  Discord: {
    viewBox: "0 0 24 24",
    className: "h-5 w-5",
    d: "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z",
  },
  Facebook: {
    viewBox: "0 0 24 24",
    className: "h-5 w-5",
    d: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  },
};

function SocialIcon(props) {
  const mark = SOCIAL_MARKS[props.label];
  if (!mark) return null;
  return (
    <svg viewBox={mark.viewBox} fill="currentColor" aria-hidden className={mark.className}>
      <path d={mark.d} />
    </svg>
  );
}

function displayUrl(href) {
  return href.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}
