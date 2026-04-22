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

// Contact form
const cform = document.getElementById('cform');
const sbtn = document.getElementById('sbtn');
const sendIcon = `<svg aria-hidden="true" style="width:17px;height:17px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>`;
cform.addEventListener('submit', async e => {
  e.preventDefault();
  sbtn.disabled = true;
  sbtn.innerHTML = `<svg style="width:17px;height:17px;animation:spin .8s linear infinite" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Sending…`;
  try {
    const r = await fetch(cform.action, { method: 'POST', body: new FormData(cform), headers: { 'Accept': 'application/json' } });
    if (r.ok) {
      sbtn.innerHTML = `<svg style="width:17px;height:17px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Sent!`;
      sbtn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
      cform.reset();
      setTimeout(() => { sbtn.disabled = false; sbtn.innerHTML = sendIcon + ' Send Message'; sbtn.style.background = ''; }, 4000);
    } else throw 0;
  } catch {
    sbtn.disabled = false;
    sbtn.innerHTML = sendIcon + ' Try Again';
    sbtn.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
    setTimeout(() => { sbtn.innerHTML = sendIcon + ' Send Message'; sbtn.style.background = ''; }, 3000);
  }
});

// Particle constellation
(function () {
  const canvas = document.getElementById('constellation');
  const ctx = canvas.getContext('2d');

  const PARTICLE_COUNT = 88;
  const CONNECT_DIST = 160;  // particle–particle line distance
  const MOUSE_DIST = 180;  // mouse influence radius
  const MOUSE_LINE = 140;  // draw lines to mouse within this radius
  const SPEED = 0.35;

  const palette = ['rgba(99,102,241,', 'rgba(6,182,212,', 'rgba(168,85,247,'];

  let W, H, particles = [];
  let mouse = { x: -9999, y: -9999 };

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Particle() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.vx = (Math.random() - 0.5) * SPEED;
    this.vy = (Math.random() - 0.5) * SPEED;
    this.ovx = this.vx;  // original velocity
    this.ovy = this.vy;
    this.r = Math.random() * 1.5 + 0.5;
    this.color = palette[Math.floor(Math.random() * palette.length)];
  }

  Particle.prototype.update = function () {
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MOUSE_DIST && dist > 0) {
      const strength = (1 - dist / MOUSE_DIST) * 0.55;
      this.vx += (dx / dist) * strength;
      this.vy += (dy / dist) * strength;
    }

    // gradually drift back to original velocity
    this.vx += (this.ovx - this.vx) * 0.035;
    this.vy += (this.ovy - this.vy) * 0.035;

    // soft speed cap
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > 1.4) { this.vx = (this.vx / spd) * 1.4; this.vy = (this.vy / spd) * 1.4; }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < -10) this.x = W + 10;
    if (this.x > W + 10) this.x = -10;
    if (this.y < -10) this.y = H + 10;
    if (this.y > H + 10) this.y = -10;
  };

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // particle–particle lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < CONNECT_DIST) {
          ctx.beginPath();
          ctx.strokeStyle = a.color + (1 - d / CONNECT_DIST) * 0.28 + ')';
          ctx.lineWidth = 0.7;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // mouse–particle lines (only when mouse is on screen)
    if (mouse.x > 0) {
      particles.forEach(p => {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MOUSE_LINE) {
          const alpha = (1 - d / MOUSE_LINE) * 0.35;
          ctx.beginPath();
          ctx.strokeStyle = p.color + alpha + ')';
          ctx.lineWidth = 0.8;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      });
    }

    // dots
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + '0.75)';
      ctx.fill();
    });
  }

  let rafId;
  function loop() {
    particles.forEach(p => p.update());
    draw();
    rafId = requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      loop();
    }
  });

  window.addEventListener('resize', init);
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  init();
  loop();
})();

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

// Theme toggle
const themeToggle = document.getElementById('themetoggle');
const themecheckbox = document.getElementById('themecheckbox');

function applyTheme(light) {
  document.documentElement.classList.toggle('light', light);
  themecheckbox.checked = !light; // checked = dark/moon, unchecked = light/sun
  themeToggle.setAttribute('aria-checked', !light);
  localStorage.setItem('theme', light ? 'light' : 'dark');
}

applyTheme(document.documentElement.classList.contains('light'));
themecheckbox.addEventListener('change', () => {
  applyTheme(!themecheckbox.checked);
});
