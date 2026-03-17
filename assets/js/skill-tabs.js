/* ── SKILL TABS ── */
function switchTab(id, btn) {
    document.querySelectorAll('.skill-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById('panel-' + id);
    panel.classList.add('active');
    btn.classList.add('active');
    // re-trigger reveal for newly shown cards
    panel.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el => {
        el.classList.remove('revealed');
        setTimeout(() => revealObserver.observe(el), 30);
    });
}
