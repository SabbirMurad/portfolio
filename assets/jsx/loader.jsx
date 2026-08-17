/* global React, profile */
/* Brief full-screen ink cover for the initial load — holds until fonts are
   ready and the hero portrait has decoded, then lifts. */
function Loader() {
  const { useState, useEffect } = React;
  const [progress, setProgress] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGone(true);
      return;
    }

    let finished = false;
    const creep = window.setInterval(() => {
      setProgress((p) => (p < 90 ? p + (90 - p) * 0.12 : p));
    }, 90);

    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    const heroReady = new Promise((resolve) => {
      const imgs = Array.from(document.images).filter(
        (i) => i.currentSrc.indexOf("hero_image") !== -1 || i.src.indexOf("hero_image") !== -1,
      );
      if (imgs.length === 0) return resolve();
      let left = imgs.length;
      const tick = () => {
        if (--left <= 0) resolve();
      };
      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth > 0) return tick();
        img.addEventListener("load", tick, { once: true });
        img.addEventListener("error", tick, { once: true });
      });
    });

    const minHold = new Promise((r) => window.setTimeout(r, 500));

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearInterval(creep);
      setProgress(100);
      window.setTimeout(() => setGone(true), 520);
    };

    Promise.all([fontsReady, heroReady, minHold]).then(finish);
    const hardStop = window.setTimeout(finish, 5000);

    return () => {
      window.clearInterval(creep);
      window.clearTimeout(hardStop);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = gone ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [gone]);

  if (gone) return null;
  const done = progress >= 100;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[200] grid place-items-center bg-ink transition-opacity duration-[400ms] ease-out ${
        done ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-5 px-6">
        <span className="display text-[clamp(1.5rem,5vw,2.5rem)] text-white">
          {profile.fullName}
          <sup className="ml-0.5 align-super text-[0.4em]">®</sup>
        </span>
        <div className="h-px w-[min(240px,60vw)] overflow-hidden bg-white/15">
          <div
            className="h-full bg-vermilion transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
