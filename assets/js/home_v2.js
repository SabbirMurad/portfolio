/* ── LOADER ── */
let pct = 0;
const loaderNum = document.getElementById('loader-num');
const loaderEl = document.getElementById('loader');
const iv = setInterval(() => {
    pct += Math.random() * 18;
    if (pct >= 100) { pct = 100; clearInterval(iv); }
    loaderNum.textContent = Math.floor(pct) + '%';
    if (pct === 100) {
        setTimeout(() => { loaderEl.classList.add('hidden'); }, 300);
    }
}, 80);

/* ── CURSOR ── */
const curEl = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
(function animCursor() {
    curEl.style.left = mx + 'px'; curEl.style.top = my + 'px';
    rx += (mx - rx) * .12; ry += (my - ry) * .12;
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(animCursor);
})();

/* ── NAV SCROLL + ACTIVE ── */
window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', scrollY > 40);
    const sections = ['hero', 'about', 'skills', 'projects', 'design', 'docs', 'contact'];
    const links = document.querySelectorAll('.nav-links a');
    let active = '';
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el && scrollY >= el.offsetTop - 120) active = id;
    });
    links.forEach(l => { l.classList.toggle('active', l.getAttribute('href') === '#' + active); });
});

/* ── MOBILE MENU ── */
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const hbg = document.getElementById('hamburger');
    const open = menu.classList.toggle('open');
    hbg.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
}
function closeMobileMenu() {
    document.getElementById('mobile-menu').classList.remove('open');
    document.getElementById('hamburger').classList.remove('open');
    document.body.style.overflow = '';
}

/* ── SCROLL REVEAL ── */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el => {
    revealObserver.observe(el);
});

/* ── ROLE PILL CYCLE ── */
const pills = document.querySelectorAll('#role-row .role-pill');
let actives = [0, 1, 2];
setInterval(() => {
    pills.forEach((p, i) => p.classList.toggle('active', actives.includes(i)));
    actives = actives.map(i => (i + 1) % pills.length);
}, 2000);

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

/* ── FILTER BUTTONS ── */
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

/* ── FORM VALIDATION ── */
function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function setRowState(rowId, state) {
    const row = document.getElementById(rowId);
    row.classList.remove('error', 'success');
    if (state) row.classList.add(state);
}

function submitForm(e) {
    e.preventDefault();
    const name = document.getElementById('inp-name').value.trim();
    const email = document.getElementById('inp-email').value.trim();
    const subject = document.getElementById('inp-subject').value.trim();
    const msg = document.getElementById('inp-msg').value.trim();
    let valid = true;

    setRowState('fr-name', !name ? 'error' : 'success'); if (!name) valid = false;
    setRowState('fr-email', !validateEmail(email) ? 'error' : 'success'); if (!validateEmail(email)) valid = false;
    setRowState('fr-subject', !subject ? 'error' : 'success'); if (!subject) valid = false;
    setRowState('fr-msg', !msg ? 'error' : 'success'); if (!msg) valid = false;

    if (!valid) return;

    // Simulate send
    const btn = e.target;
    btn.textContent = 'Sending…';
    btn.style.opacity = '.6';
    setTimeout(() => {
        document.getElementById('contact-form').querySelector('.form-row') &&
            ['fr-name', 'fr-email', 'fr-subject', 'fr-msg'].forEach(id => {
                document.getElementById(id).style.display = 'none';
            });
        document.querySelector('.form-submit').style.display = 'none';
        document.getElementById('form-success').classList.add('visible');
    }, 1200);
}