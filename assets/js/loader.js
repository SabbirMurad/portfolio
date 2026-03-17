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
