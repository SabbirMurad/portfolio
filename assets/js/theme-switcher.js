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
