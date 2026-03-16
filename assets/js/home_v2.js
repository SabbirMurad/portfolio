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
    const sections = ['hero', 'about', 'services', 'skills', 'experience', 'projects', 'opensource', 'design', 'docs', 'youtube', 'freelance', 'contact'];
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

/* ── FILTER BUTTONS (FLIP shuffle) ── */
let filtering = false;
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (filtering) return;
        const filter = btn.dataset.filter;
        const activeBtn = document.querySelector('.filter-btn.active');
        if (activeBtn === btn) return;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filtering = true;

        const grid = document.querySelector('.projects-grid');
        const cards = [...document.querySelectorAll('.project-card')];

        // FIRST: snapshot current positions of visible cards
        const firstRects = new Map();
        cards.forEach(card => {
            if (!card.classList.contains('filter-hidden')) {
                firstRects.set(card, card.getBoundingClientRect());
            }
        });

        // Determine which cards match
        const matching = [];
        const leaving = [];
        cards.forEach(card => {
            const cats = (card.dataset.category || '').split(' ');
            const show = filter === 'all' || cats.includes(filter);
            if (show) matching.push(card);
            else leaving.push(card);
        });

        // Fade out leaving cards
        leaving.forEach(card => {
            if (!card.classList.contains('filter-hidden')) {
                card.classList.add('flip-animate', 'filter-fade-out');
            }
        });

        setTimeout(() => {
            // Hide leaving cards, show matching cards
            leaving.forEach(card => {
                card.classList.add('filter-hidden');
                card.classList.remove('filter-fade-out', 'flip-animate');
            });

            // Reveal new cards (mark them for fade-in)
            const entering = [];
            matching.forEach(card => {
                if (card.classList.contains('filter-hidden')) {
                    entering.push(card);
                    card.classList.remove('filter-hidden');
                    card.classList.add('filter-fade-in');
                }
            });

            // LAST: snapshot new positions
            void grid.offsetHeight;
            const lastRects = new Map();
            matching.forEach(card => {
                lastRects.set(card, card.getBoundingClientRect());
            });

            // INVERT + PLAY: animate cards that were visible before and after
            matching.forEach(card => {
                if (entering.includes(card)) return; // handle separately
                const first = firstRects.get(card);
                const last = lastRects.get(card);
                if (!first || !last) return;
                const dx = first.left - last.left;
                const dy = first.top - last.top;
                if (dx === 0 && dy === 0) return;
                card.style.transform = `translate(${dx}px, ${dy}px)`;
                void card.offsetHeight;
                card.classList.add('flip-animate');
                card.style.transform = '';
            });

            // Fade in entering cards with stagger
            requestAnimationFrame(() => {
                entering.forEach((card, i) => {
                    setTimeout(() => {
                        card.classList.add('flip-animate');
                        card.classList.remove('filter-fade-in');
                    }, i * 60);
                });
            });

            setTimeout(() => {
                cards.forEach(card => card.classList.remove('flip-animate'));
                filtering = false;
            }, 500);
        }, 300);
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
        ['fr-name', 'fr-email', 'fr-subject', 'fr-msg'].forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
        document.querySelector('.form-submit').style.display = 'none';
        document.getElementById('form-success').classList.add('visible');
    }, 1200);
}

/* ── YOUTUBE CLICK-TO-LOAD ── */
function loadFeaturedVideo() {
    const facade = document.getElementById('yt-facade');
    const wrap = document.getElementById('yt-iframe-wrap');
    // Replace with your actual YouTube video ID
    const videoId = 'dQw4w9WgXcQ';
    facade.style.display = 'none';
    wrap.style.display = 'block';
    wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
}

/* ── AUTO THEME SWITCH — SLICE GLITCH every 10s ── */
let glitching = false;
const themes = ['amber', 'crimson', 'emerald', 'purple'];
const startIndex = Math.floor(Math.random() * themes.length);
let currentTheme = themes[startIndex];
if (currentTheme !== 'amber') document.documentElement.classList.add('theme-' + currentTheme);

function glitchSwitchTheme() {
    if (glitching) return;
    glitching = true;

    const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
    const overlay = document.getElementById('glitch-overlay');
    const flash = document.getElementById('glitch-flash');

    // 1. Scanline sweep
    const sweep = document.createElement('div');
    sweep.className = 'scanline-sweep';
    document.body.appendChild(sweep);

    // 2. RGB body class
    document.body.classList.add('glitching');

    // 3. Build random slices
    overlay.innerHTML = '';
    overlay.style.opacity = '1';
    const accentMap = { amber: '232,147,10', crimson: '220,20,60', emerald: '46,204,113', purple: '123,47,247' };
    const rgbNew = accentMap[nextTheme];
    const rgbOld = accentMap[currentTheme];
    let topPos = 0;
    const sliceCount = 12;
    for (let i = 0; i < sliceCount; i++) {
        const h = Math.random() * 12 + 3;
        const slice = document.createElement('div');
        slice.className = 'g-slice';
        slice.style.top = topPos + '%';
        slice.style.height = h + '%';
        slice.style.transform = `translateX(${(Math.random() - 0.5) * 28}px)`;
        slice.style.opacity = (Math.random() * 0.8 + 0.2).toString();
        slice.style.background = i % 3 === 0
            ? `rgba(${rgbNew},0.08)`
            : i % 3 === 1
                ? `rgba(${rgbOld},0.06)`
                : 'rgba(12,12,10,0.9)';
        overlay.appendChild(slice);
        topPos += h;
        if (topPos > 100) break;
    }

    // 4. Flash
    flash.style.transition = 'none';
    flash.style.opacity = '0.15';

    // 5. Jitter loop
    let jitterCount = 0;
    const jitterInterval = setInterval(() => {
        overlay.querySelectorAll('.g-slice').forEach(s => {
            s.style.transform = `translateX(${(Math.random() - 0.5) * 32}px)`;
            s.style.opacity = (Math.random() * 0.7 + 0.1).toString();
        });
        jitterCount++;
        if (jitterCount > 6) {
            clearInterval(jitterInterval);

            // 6. Switch theme at peak
            document.documentElement.classList.remove('theme-crimson', 'theme-emerald', 'theme-purple');
            if (nextTheme !== 'amber') document.documentElement.classList.add('theme-' + nextTheme);
            currentTheme = nextTheme;

            // 7. Sweep out
            overlay.querySelectorAll('.g-slice').forEach((s, i) => {
                s.style.transition = `transform ${0.1 + i * 0.018}s ease, opacity ${0.12 + i * 0.015}s ease`;
                s.style.transform = 'translateX(0)';
                s.style.opacity = '0';
            });
            flash.style.transition = 'opacity .25s ease';
            flash.style.opacity = '0';

            setTimeout(() => {
                overlay.style.opacity = '0';
                overlay.innerHTML = '';
                sweep.remove();
                document.body.classList.remove('glitching');
                glitching = false;
            }, 350);
        }
    }, 45);
}

// Auto-trigger every 8 seconds
setTimeout(() => {
    glitchSwitchTheme();
    setInterval(glitchSwitchTheme, 10000);
}, 10000);

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

/* ── PARALLAX TILT on project cards ── */
document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `translateY(-6px) perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
});

/* ── LEETCODE STATS (live from API) ── */
(function fetchLeetCode() {
    fetch('https://alfa-leetcode-api.onrender.com/sabbir0087/solved')
    .then(r => r.json())
    .then(data => {
        const total = data?.solvedProblem;
        if (!total) return;
        const statEl = document.getElementById('lc-stat');
        const projEl = document.getElementById('lc-proj');
        const breakEl = document.getElementById('lc-breakdown');
        if (statEl) statEl.innerHTML = total + '+';
        if (projEl) projEl.textContent = total + '+';
        if (breakEl) {
            const e = data.easySolved || 0;
            const m = data.mediumSolved || 0;
            const h = data.hardSolved || 0;
            breakEl.innerHTML =
                '<span style="color:#00b8a3;">E:' + e + '</span>' +
                '<span style="color:#ffc01e;">M:' + m + '</span>' +
                '<span style="color:#ff375f;">H:' + h + '</span>';
        }
    })
    .catch(() => {});
})();