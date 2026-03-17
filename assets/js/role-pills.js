/* ── ROLE PILL CYCLE ── */
const pills = document.querySelectorAll('#role-row .role-pill');
let actives = [0, 1, 2];
setInterval(() => {
    pills.forEach((p, i) => p.classList.toggle('active', actives.includes(i)));
    actives = actives.map(i => (i + 1) % pills.length);
}, 2000);
