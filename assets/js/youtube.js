/* ── YOUTUBE CLICK-TO-LOAD ── */
function loadFeaturedVideo() {
    const facade = document.getElementById('yt-facade');
    const wrap = document.getElementById('yt-iframe-wrap');
    // Replace with your actual YouTube video ID
    const videoId = 'dQw4w9WgXcQ';
    facade.style.display = 'none';
    wrap.style.display = 'block';
    wrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
}
