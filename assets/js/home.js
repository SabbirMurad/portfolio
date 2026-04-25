// Intercept anchor clicks so Lenis handles them smoothly
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -100, duration: 0.9 });
  });
});

// Nav scroll + hide-on-down + active — driven by Lenis directly
const nav = document.getElementById('nav');
const secs = ['hero', 'about', 'timeline', 'services', 'skills', 'projects', 'docs', 'youtube', 'freelance', 'contact'];
let lastY = 0;
lenis.on('scroll', ({ scroll: y }) => {
  nav.classList.toggle('scrolled', y > 20);
  if (y > lastY && y > 120) {
    nav.classList.add('hide');
  } else {
    nav.classList.remove('hide');
  }
  lastY = y;
  let cur = '';
  secs.forEach(id => {
    const s = document.getElementById(id);
    if (s && s.getBoundingClientRect().top <= 120) cur = id;
  });
  document.querySelectorAll('.nl a').forEach(a => {
    a.classList.toggle('act', a.getAttribute('href') === '#' + cur);
  });
});

// Mobile menu
const mbtoggle = document.getElementById('mbtoggle');
const mm = document.getElementById('mm');
mbtoggle.addEventListener('click', () => {
  const open = mm.classList.toggle('open');
  mbtoggle.classList.toggle('open', open);
  mbtoggle.setAttribute('aria-expanded', open);
});
function closeMM() {
  mm.classList.remove('open');
  mbtoggle.classList.remove('open');
  mbtoggle.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', e => {
  if (!nav.contains(e.target) && !mm.contains(e.target)) closeMM();
});

// Scroll reveal
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); } });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.rv').forEach(el => obs.observe(el));

// Page loader — dismiss on load or after 1.5s max, whichever is first
const dismissLoader = () => document.getElementById('loader').classList.add('done');
window.addEventListener('load', dismissLoader);
setTimeout(dismissLoader, 1500);

// Extend reveal observer to handle rv-left / rv-right too
document.querySelectorAll('.rv-left, .rv-right').forEach(el => obs.observe(el));

// Stat counter
function countUp(el, target, suffix) {
  const dur = 1400, start = performance.now();
  const isInf = target === '∞';
  if (isInf) { el.textContent = '∞'; return; }
  const num = parseInt(target);
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(ease * num) + suffix;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target + suffix;
  })(start);
}

const statObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    statObs.unobserve(e.target);
    const raw = e.target.dataset.count;
    const suffix = e.target.dataset.suffix || '';
    countUp(e.target, raw, suffix);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.hstat-n').forEach(el => {
  const txt = el.textContent.trim();
  const num = txt.replace(/[^0-9∞]/g, '');
  const suffix = txt.replace(/[0-9∞]/g, '');
  el.dataset.count = num;
  el.dataset.suffix = suffix;
  el.textContent = '0' + suffix;
  statObs.observe(el);
});

// 3-D card tilt
document.querySelectorAll('.tilt').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(6px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// Magnetic CTA buttons
document.querySelectorAll('.bp').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.25;
    const y = (e.clientY - r.top - r.height / 2) * 0.25;
    btn.style.transform = `translate(${x}px, ${y}px) translateY(-2px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
});

// Copy email
const copyBtn = document.querySelector('.copy-email');
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText('sbbir0087@gmail.com').then(() => {
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = `<svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = `<svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`;
      }, 2000);
    });
  });
}

// Back to top
const btt = document.getElementById('btt');
lenis.on('scroll', ({ scroll: y }) => { btt.classList.toggle('vis', y > 400); });
btt.addEventListener('click', () => lenis.scrollTo(0, { duration: 0.9 }));

// Orb scroll parallax — driven by Lenis
const o1 = document.querySelector('.o1');
const o2 = document.querySelector('.o2');
const o3 = document.querySelector('.o3');
lenis.on('scroll', ({ scroll: y }) => {
  if (o1) o1.style.transform = `translate(${y * 0.04}px, ${y * 0.06}px) scale(1)`;
  if (o2) o2.style.transform = `translate(${-y * 0.03}px, ${-y * 0.05}px) scale(1)`;
  if (o3) o3.style.transform = `translate(${y * 0.02}px, ${-y * 0.04}px) scale(1)`;
});