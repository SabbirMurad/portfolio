/* ── COUNT-UP ANIMATION for stat numbers ── */
function animateCountUp(el) {
    const raw = el.textContent.trim();
    const match = raw.match(/^([\d.]+)(.*)$/);
    if (!match) { el.classList.add('counted'); return; }
    const target = parseFloat(match[1]);
    const suffix = match[2] || '';
    const isFloat = match[1].includes('.');
    const duration = 1200;
    const start = performance.now();
    el.classList.remove('count-up');
    el.classList.add('counted');
    function step(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const val = isFloat ? (target * ease).toFixed(1) : Math.round(target * ease);
        el.textContent = val + suffix;
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.querySelectorAll('.stat-num, .uw-stat-val').forEach(el => {
                if (!el.dataset.counted) {
                    el.dataset.counted = '1';
                    animateCountUp(el);
                }
            });
        }
    });
}, { threshold: 0.3 });

document.querySelectorAll('.stats-strip, .uw-stats').forEach(el => countObserver.observe(el));
