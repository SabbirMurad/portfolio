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
