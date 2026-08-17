/* global React, SocialIcon, displayUrl, profile, navLinks, socials */
function Nav() {
  const { useState, useEffect, useRef } = React;
  const [open, setOpen] = useState(false);
  // "top" parked in hero | "hidden" scrolled away | "shown" brought back up
  const [mode, setMode] = useState("top");
  const [overHero, setOverHero] = useState(true);

  const menuLinks = [...navLinks, { label: "Résumé", href: "/assets/cv.pdf" }];

  useEffect(() => {
    const navH =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72;
    let heroH = 0;
    const measure = () => {
      const el = document.getElementById("home");
      heroH = el ? el.offsetHeight : 0;
    };
    measure();
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - last;
      setOverHero(y < heroH - navH);
      if (y <= 2) setMode("top");
      else if (y > navH && Math.abs(delta) > 2) setMode(delta > 0 ? "hidden" : "shown");
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Lock body scroll while the menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const surface =
    open || mode === "top"
      ? { bg: "rgba(255,255,255,0)", blur: "blur(0px)", color: "#ffffff", onDark: true }
      : overHero
        ? { bg: "rgba(255,255,255,0.10)", blur: "blur(16px)", color: "#ffffff", onDark: true }
        : { bg: "rgba(255,255,255,0.72)", blur: "blur(16px)", color: "#0b0b0b", onDark: false };

  return (
    <React.Fragment>
      <header
        data-cursor-theme={surface.onDark ? "dark" : undefined}
        className={`inset-x-0 top-0 z-[120] ${mode === "top" ? "absolute" : "fixed"}`}
        style={{
          transform: mode === "hidden" ? "translateY(-100%)" : "translateY(0%)",
          backgroundColor: surface.bg,
          backdropFilter: surface.blur,
          WebkitBackdropFilter: surface.blur,
          color: surface.color,
          transition:
            "transform .45s cubic-bezier(0.76,0,0.24,1), background-color .45s, backdrop-filter .45s, color .45s",
        }}
      >
        <div className="mx-auto flex h-[var(--nav-h)] max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="#home" className="display-tight text-[23px] font-bold tracking-tight">
            {profile.name}
            <sup className="ml-0.5 text-[10px]">®</sup>
          </a>

          <nav
            className={`hidden items-center gap-[clamp(1.5rem,9vw,7rem)] transition-opacity duration-300 lg:flex ${
              open ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="group relative whitespace-nowrap text-[16px] font-medium"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-vermilion transition-all duration-400 group-hover:w-full" />
              </a>
            ))}
          </nav>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="relative z-[110] flex h-10 w-10 flex-col items-end justify-center gap-[6px]"
          >
            <span
              className={`block h-[2px] w-[26px] origin-center ${open ? "bg-white" : "bg-current"}`}
              style={{
                transform: open ? "translateY(4px) rotate(45deg)" : "none",
                transition: "transform .45s cubic-bezier(0.76,0,0.24,1)",
              }}
            />
            <span
              className={`block h-[2px] origin-center ${open ? "bg-white" : "bg-current"}`}
              style={{
                width: open ? 26 : 18,
                transform: open ? "translateY(-4px) rotate(-45deg)" : "none",
                transition: "transform .45s cubic-bezier(0.76,0,0.24,1), width .45s",
              }}
            />
          </button>
        </div>
      </header>

      {/* Full-screen menu overlay */}
      <div
        data-cursor-theme="dark"
        className="fixed inset-0 z-[105] bg-ink text-white"
        style={{
          transform: open ? "translateY(0%)" : "translateY(-100%)",
          transition: "transform .8s cubic-bezier(0.76,0,0.24,1)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <span
          aria-hidden
          className="display pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[26vw] text-white/[0.035]"
        >
          Menu
        </span>

        <div className="relative mx-auto grid h-full max-w-[1600px] content-center gap-y-12 px-5 sm:px-8 lg:grid-cols-3 lg:gap-x-16 lg:px-12">
          <ul className="lg:col-span-2">
            {menuLinks.map((l, i) => (
              <li
                key={l.href}
                className="border-b border-white/10"
                style={{
                  transform: open ? "translateY(0)" : "translateY(60px)",
                  opacity: open ? 1 : 0,
                  transition: "transform .7s cubic-bezier(0.16,1,0.3,1), opacity .7s",
                  transitionDelay: open ? `${0.22 + i * 0.06}s` : "0s",
                }}
              >
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between py-3 sm:py-4"
                >
                  <span className="display text-display-md transition-colors duration-300 group-hover:text-vermilion">
                    {l.label}
                  </span>
                  <span className="text-2xl text-white/30 transition-all duration-300 group-hover:rotate-90 group-hover:text-vermilion">
                    +
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div
            className="flex flex-col gap-8 lg:self-end lg:pb-1"
            style={{
              opacity: open ? 1 : 0,
              transition: "opacity .6s",
              transitionDelay: open ? "0.6s" : "0s",
            }}
          >
            <div>
              <p className="meta mb-2 text-white/40">Get in touch</p>
              <a
                href={`mailto:${profile.email}`}
                className="break-all text-lg transition-colors hover:text-vermilion"
              >
                {profile.email}
              </a>
            </div>

            <div className="flex flex-col gap-6 border-t border-white/10 pt-8">
              {socials.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4"
                >
                  <span className="flex w-7 shrink-0 justify-center text-white/70 transition-colors duration-300 group-hover:text-vermilion">
                    <SocialIcon label={s.label} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold transition-colors duration-300 group-hover:text-vermilion">
                      {s.label}
                    </span>
                    <span className="block truncate text-[11.5px] tracking-[0.02em] text-white/35">
                      {displayUrl(s.href)}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="shrink-0 text-white/25 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-vermilion"
                  >
                    ↗
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
