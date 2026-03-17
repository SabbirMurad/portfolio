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
