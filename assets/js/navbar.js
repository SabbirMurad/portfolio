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
