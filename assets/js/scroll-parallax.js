/* ═══════════════════════════════════════════
   SCROLL PARALLAX + VIDEO REEL
   Scroll-driven background animation and
   video reel chunked reveal.
═══════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── ELEMENTS ─── */
  const orb1          = document.querySelector('.orb-1');
  const orb2          = document.querySelector('.orb-2');
  const gridBg        = document.querySelector('.grid-bg');
  const progressBar   = document.getElementById('scroll-progress-fill');

  const vrSection     = document.querySelector('.video-reel');
  const vrVisual      = document.getElementById('vr-visual');
  const vrChunks      = document.querySelectorAll('.vr-chunk');
  const vrTexts       = document.querySelectorAll('.vr-text');
  const vrFill        = document.getElementById('vr-progress-fill');
  const vrVideo       = document.getElementById('vr-video');
  const vrFallback    = document.getElementById('vr-fallback');

  /* Show fallback when video has no src */
  if (vrVideo && !vrVideo.querySelector('source') && vrFallback) {
    vrVideo.style.display = 'none';
    vrFallback.style.display = 'block';
  }

  /* ─── EASING ─── */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /* ─── TOP SCROLL PROGRESS BAR ─── */
  function updateScrollProgress() {
    if (!progressBar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressBar.style.width = pct + '%';
  }

  /* ─── ORB PARALLAX ─── */
  function updateOrbs() {
    const sy = window.scrollY;
    if (orb1) {
      orb1.style.transform = `translate(${sy * 0.06}px, ${sy * 0.18}px) scale(1)`;
    }
    if (orb2) {
      orb2.style.transform = `translate(${sy * -0.04}px, ${sy * -0.12}px) scale(1)`;
    }
    /* Subtle grid drift */
    if (gridBg) {
      gridBg.style.transform = `translateY(${sy * 0.04}px)`;
    }
  }

  /* ─── VIDEO REEL ─── */
  function updateVideoReel() {
    if (!vrSection || !vrVisual) return;

    const rect       = vrSection.getBoundingClientRect();
    const sectionH   = vrSection.offsetHeight;
    const vh         = window.innerHeight;
    const scrolled   = -rect.top;               /* px scrolled into section */
    const totalScroll = sectionH - vh;
    const p          = clamp(scrolled / totalScroll, 0, 1);

    /* Progress fill */
    if (vrFill) vrFill.style.width = (p * 100) + 'px';

    /* ── Phase 1 (0 → 0.18): chunks stagger in ── */
    vrChunks.forEach(function (chunk, i) {
      var start = i * 0.025;
      var cp    = clamp((p - start) / 0.14, 0, 1);
      var ep    = easeOutCubic(cp);
      chunk.style.opacity   = ep;
      chunk.style.transform = `translateY(${(1 - ep) * 28}px)`;
    });

    /* ── Phase 2 (0.10 → 0.68): clip-path expands ── */
    var vidP   = clamp((p - 0.10) / 0.58, 0, 1);
    var vidE   = easeInOutCubic(vidP);
    var insetV = (1 - vidE) * 18;
    var insetH = (1 - vidE) * 22;
    var radius = (1 - vidE) * 16;
    var scale  = 1 + (1 - vidE) * 0.07;

    vrVisual.style.clipPath  = `inset(${insetV.toFixed(2)}% ${insetH.toFixed(2)}% round ${radius.toFixed(1)}px)`;
    vrVisual.style.transform = `scale(${scale.toFixed(4)})`;

    /* Toggle border visibility */
    if (vidE > 0.95) {
      vrVisual.classList.add('expanded');
    } else {
      vrVisual.classList.remove('expanded');
    }

    /* Fade out chunks as video expands past half */
    if (vidP > 0.45) {
      var fade = clamp((vidP - 0.45) / 0.45, 0, 1);
      vrChunks.forEach(function (chunk) {
        chunk.style.opacity = (1 - fade);
      });
    }

    /* ── Phase 3 (0.68 → 1.0): overlay text reveals ── */
    vrTexts.forEach(function (el, i) {
      var start = 0.68 + i * 0.10;
      var tp    = clamp((p - start) / 0.18, 0, 1);
      var te    = easeOutCubic(tp);
      el.style.opacity   = te;
      el.style.transform = `translateY(${((1 - te) * 24).toFixed(1)}px)`;
    });
  }

  /* ─── RAF LOOP ─── */
  var ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(function () {
        updateScrollProgress();
        updateOrbs();
        updateVideoReel();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* Initial paint */
  updateScrollProgress();
  updateOrbs();
  updateVideoReel();

})();
