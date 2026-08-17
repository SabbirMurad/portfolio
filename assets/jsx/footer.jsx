/* global React, profile, socials, navLinks */
function Footer() {
  return (
    <footer className="bg-paper pt-20">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 border-b border-line pb-16 lg:grid-cols-[1fr_auto] lg:gap-20">
          <div>
            <p className="max-w-md text-[15px] leading-[1.75] text-muted-2">
              Focused on building fast, well-designed software that blends systems engineering with
              interface craft to{" "}
              <span className="font-semibold text-ink">help products feel effortless</span> for the
              people using them.
            </p>
            <a
              href={`mailto:${profile.email}`}
              className="mt-6 inline-block text-[15px] font-semibold transition-colors hover:text-vermilion"
            >
              {profile.email}
            </a>
          </div>

          <div className="grid grid-cols-2 gap-x-14 gap-y-3 sm:gap-x-20">
            <div>
              <p className="meta mb-4 text-muted">Navigation</p>
              <ul className="space-y-2.5">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-[13px] transition-colors hover:text-vermilion">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="meta mb-4 text-muted">Elsewhere</p>
              <ul className="space-y-2.5">
                {socials.map((s) => (
                  <li key={s.href}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] transition-colors hover:text-vermilion"
                    >
                      {s.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="relative py-10">
          <h2 className="display-tight flex items-start justify-center text-[19vw] font-bold leading-[0.85]">
            {profile.name}
            <sup className="mt-[1.15em] text-[0.15em] leading-none">®</sup>
          </h2>
        </div>
      </div>

      <div data-cursor-theme="dark" className="bg-ink py-5 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 sm:px-8 lg:px-12">
          <p className="meta text-white/50">
            © {profile.year} {profile.fullName} — All rights reserved
          </p>
          <a href="#home" className="meta text-white/50 transition-colors hover:text-vermilion">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
