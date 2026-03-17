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
