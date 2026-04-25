// Lenis smooth scroll
const lenis = new Lenis({
    duration: 0.8,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,
});

// Lenis RAF loop
function lenisRaf(time) { lenis.raf(time); requestAnimationFrame(lenisRaf); }
requestAnimationFrame(lenisRaf);