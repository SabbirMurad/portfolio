function formatCount(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

async function loadYoutubeChannel() {
    try {
        const res  = await fetch('/api/youtube/feed');
        if (!res.ok) return;
        const data = await res.json();

        const ch = data.channel;
        if (!ch) return;

        const avatarEl = document.getElementById('yt-avatar');
        if (ch.avatar_url) {
            avatarEl.innerHTML = `<img src="${ch.avatar_url}" alt="${ch.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
        } else {
            avatarEl.textContent = ch.name?.[0] ?? 'S';
        }

        const nameEl = document.getElementById('yt-channel-name');
        if (nameEl) nameEl.textContent = ch.name;

        document.getElementById('yt-subscribers').textContent  = ch.subscribers;
        document.getElementById('yt-video-count').textContent  = ch.video_count;
        document.getElementById('yt-total-views').textContent  = ch.total_views;
        document.getElementById('yt-since').textContent        = ch.since;

        const descEl = document.getElementById('yt-description');
        if (descEl && ch.description) descEl.textContent = ch.description;

    } catch (err) {
        console.warn('YouTube feed fetch failed:', err);
    }
}

loadYoutubeChannel();
