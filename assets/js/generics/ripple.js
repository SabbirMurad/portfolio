document.body.addEventListener('pointerdown', (e) => {
    const ripple = document.createElement('div');
    ripple.classList.add('ripple');
    ripple.style.left = `${e.clientX - 50}px`;
    ripple.style.top = `${e.clientY - 50}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600); // Match animation duration
});