const cform = document.getElementById('cform');
const sbtn = document.getElementById('sbtn');
const sendIcon = `<svg aria-hidden="true" style="width:17px;height:17px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>`;
const spinIcon = `<svg style="width:17px;height:17px;animation:spin .8s linear infinite" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`;

cform.addEventListener('submit', async e => {
    e.preventDefault();

    const name    = document.getElementById('fname').value.trim();
    const email   = document.getElementById('femail').value.trim();
    const subject = document.getElementById('fsubject').value.trim();
    const message = document.getElementById('fmsg').value.trim();

    if (!name || !email || !subject || !message) return;

    sbtn.disabled = true;
    sbtn.innerHTML = `${spinIcon} Sending…`;

    const result = await Fetcher.post({
        endpoint: '/contact',
        body: { name, email, subject, message },
        showError: false,
    });

    if (result.ok) {
        sbtn.innerHTML = `<svg style="width:17px;height:17px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Sent!`;
        sbtn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
        cform.reset();
        setTimeout(() => {
            sbtn.disabled = false;
            sbtn.innerHTML = sendIcon + ' Send Message';
            sbtn.style.background = '';
        }, 4000);
    } else {
        sbtn.disabled = false;
        sbtn.innerHTML = sendIcon + ' Try Again';
        sbtn.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
        setTimeout(() => {
            sbtn.innerHTML = sendIcon + ' Send Message';
            sbtn.style.background = '';
        }, 3000);
    }
});
