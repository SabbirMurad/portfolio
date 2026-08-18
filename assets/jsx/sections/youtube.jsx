/* global React, Parallax, Reveal, RevealLayer, SplitHeading, SocialIcon, socials, youtube */
/*
 * YouTube — a click-to-play player beside the channel panel, with the rest of
 * the recent uploads underneath. Live numbers and thumbnails come from
 * /api/youtube/feed (server-side cached for an hour); `youtube` in data.jsx is
 * what renders until — or instead of — that response.
 *
 * Nothing embeds on load: the poster is an image and the iframe is only mounted
 * once a video is actually picked.
 */

const YT_URL =
  (socials.find((s) => s.label === "YouTube") || {}).href ||
  "https://www.youtube.com/@itscompiletime";

/* Poster fallbacks for entries with no thumbnail — same gradient recipe the
   project cards use, so an empty feed still looks deliberate. */
const YT_POSTERS = ["#DE4520", "#54C5F8", "#A855F7", "#22C55E"];

function _YtPoster(props) {
  const { video, index, zoom = false } = props;
  if (video.thumbnail) {
    return (
      <img
        src={video.thumbnail}
        alt=""
        loading="lazy"
        className={
          "h-full w-full object-cover" +
          (zoom
            ? " transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            : "")
        }
      />
    );
  }
  const tone = YT_POSTERS[index % YT_POSTERS.length];
  return (
    <div
      className="grid h-full w-full place-items-center"
      style={{ background: `linear-gradient(145deg, ${tone}, ${tone}bb 45%, #0b0b0b)` }}
    >
      <span className="display text-[clamp(1.1rem,2.4vw,2rem)] text-white/20">
        {video.label || "Compile Time"}
      </span>
    </div>
  );
}

/* views · published — joined only from the parts the feed actually gave us. */
function _YtMeta(props) {
  const { video, className = "" } = props;
  const parts = [];
  if (video.views) parts.push(video.views + " views");
  if (video.published_at) parts.push(video.published_at);
  if (!parts.length) return null;
  return <span className={"meta " + className}>{parts.join(" · ")}</span>;
}

function _YtDuration(props) {
  if (!props.video.duration) return null;
  return (
    <span className="meta absolute bottom-2.5 right-2.5 rounded-sm bg-ink/80 px-2 py-1 text-white">
      {props.video.duration}
    </span>
  );
}

/* An upload card is a play button when we can embed it, an outbound link when
   we can't — the visual shell is identical either way. */
function _YtCard(props) {
  const { video, index, onPlay, children } = props;
  const shell =
    "group flex h-full w-full flex-col overflow-hidden rounded-sm border border-line bg-paper text-left transition-colors duration-500 hover:border-ink/25";
  const body = (
    <React.Fragment>
      <span className="relative block aspect-video overflow-hidden bg-ink">
        <_YtPoster video={video} index={index} zoom />
        <span className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/25" />
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/95 text-ink opacity-0 transition-all duration-500 group-hover:opacity-100">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-0.5 h-4 w-4">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
        <_YtDuration video={video} />
      </span>

      <span className="flex flex-1 flex-col p-5">
        <span className="display-tight line-clamp-2 text-[15px] font-bold leading-snug transition-colors duration-400 group-hover:text-vermilion">
          {video.title}
        </span>
        <span className="mt-auto flex items-end justify-between gap-4 pt-5">
          <_YtMeta video={video} className="text-muted-2" />
          <span className="text-muted-2 transition-all duration-400 group-hover:translate-x-1 group-hover:text-vermilion">
            →
          </span>
        </span>
      </span>
      {children}
    </React.Fragment>
  );

  return video.video_id ? (
    <button
      type="button"
      onClick={onPlay}
      data-cursor="play"
      data-cursor-label="PLAY"
      className={shell}
    >
      {body}
    </button>
  ) : (
    <a
      href={YT_URL}
      target="_blank"
      rel="noreferrer"
      data-cursor="view"
      data-cursor-label="WATCH"
      className={shell}
    >
      {body}
    </a>
  );
}

function Youtube() {
  const [feed, setFeed] = React.useState(youtube);
  const [featured, setFeatured] = React.useState(0);
  const [playing, setPlaying] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/youtube/feed")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d || !d.channel) return;
        setFeed({
          channel: { ...youtube.channel, ...d.channel },
          videos: d.videos && d.videos.length ? d.videos : youtube.videos,
        });
        setFeatured(0);
        setPlaying(null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const ch = feed.channel;
  const main = feed.videos[featured] || youtube.videos[0];
  const rest = feed.videos
    .map((v, i) => ({ v, i }))
    .filter((x) => x.i !== featured)
    .slice(0, 3);

  const channelStats = [
    { n: ch.subscribers, l: "Subscribers" },
    { n: ch.video_count, l: "Videos" },
    { n: ch.total_views, l: "Total views" },
    { n: ch.since, l: "Since" },
  ];

  const pick = (i) => {
    setFeatured(i);
    setPlaying(feed.videos[i].video_id);
  };

  return (
    <section id="youtube" className="bg-bone py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <Reveal distance={26}>
          <div className="flex items-center gap-2.5 text-vermilion">
            <SocialIcon label="YouTube" />
            <span className="meta text-muted-2">{ch.handle}</span>
          </div>
        </Reveal>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-8">
          <div>
            <SplitHeading
              as="h2"
              text="Teaching what I build on YouTube"
              className="display text-display-lg max-w-[13ch]"
              accentWords={[5]}
            />
          </div>

          <Reveal from="right" delay={0.1}>
            <p className="max-w-sm text-[14px] leading-[1.75] text-muted-2">
              Coding tutorials, dev-log series and UI/UX breakdowns — the same systems work from
              the projects above, taken apart on camera.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.55fr_1fr] lg:gap-10">
          {/* ── Featured player ── */}
          <Reveal from="left" scaleFrom={1} distance={40}>
            <RevealLayer scaleFrom={1.12} distance={0} className="overflow-hidden rounded-sm">
              <div className="relative aspect-video overflow-hidden bg-ink">
                {playing ? (
                  <iframe
                    key={playing}
                    src={`https://www.youtube.com/embed/${playing}?autoplay=1&rel=0&modestbranding=1`}
                    title={main.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                ) : main.video_id ? (
                  <button
                    type="button"
                    onClick={() => setPlaying(main.video_id)}
                    data-cursor="play"
                    data-cursor-label="PLAY"
                    className="group absolute inset-0 block h-full w-full"
                    aria-label={`Play ${main.title}`}
                  >
                    <_YtPoster video={main} index={featured} zoom />
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                    <span className="pointer-events-none absolute inset-0 grid place-items-center">
                      <span className="grid h-[68px] w-[68px] place-items-center rounded-full bg-white text-ink transition-colors duration-400 group-hover:bg-vermilion group-hover:text-white sm:h-20 sm:w-20">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-1 h-7 w-7">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    </span>
                    <_YtDuration video={main} />
                  </button>
                ) : (
                  <a
                    href={YT_URL}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="view"
                    data-cursor-label="WATCH"
                    className="group absolute inset-0 block h-full w-full"
                  >
                    <_YtPoster video={main} index={featured} zoom />
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                  </a>
                )}
              </div>
            </RevealLayer>

            <RevealLayer delay={0.12} distance={24}>
              <div className="mt-4 flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <h3 className="display-tight text-lg font-bold leading-tight sm:text-xl">
                  {main.title}
                </h3>
                <_YtMeta video={main} className="shrink-0 text-muted" />
              </div>
            </RevealLayer>

            <RevealLayer delay={0.2} distance={18}>
              <a
                href={main.video_id ? `${YT_URL}/videos` : YT_URL}
                target="_blank"
                rel="noreferrer"
                data-cursor="view"
                className="group mt-3 inline-flex items-center gap-2 text-muted-2 transition-colors duration-400 hover:text-vermilion"
              >
                <span className="meta">All uploads</span>
                <span className="transition-transform duration-400 group-hover:translate-x-1">→</span>
              </a>
            </RevealLayer>
          </Reveal>

          {/* ── Channel panel ── */}
          <Parallax amount={18} className="h-full">
            <Reveal from="right" delay={0.12} scaleFrom={1} distance={40} className="h-full">
              <div
                data-cursor-theme="dark"
                className="flex h-full flex-col rounded-sm bg-ink p-7 text-white sm:p-8"
              >
                <a
                  href={YT_URL}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="view"
                  className="group flex items-center gap-4"
                >
                  <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-vermilion text-lg font-bold">
                    {ch.avatar_url ? (
                      <img
                        src={ch.avatar_url}
                        alt={ch.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      (ch.name || "S").charAt(0)
                    )}
                  </span>

                  <span className="min-w-0">
                    <span className="display-tight block truncate text-lg font-bold transition-colors duration-400 group-hover:text-vermilion">
                      {ch.name}
                    </span>
                    <span className="meta block truncate text-white/45">{ch.handle}</span>
                  </span>

                  <span className="ml-auto shrink-0 text-white/45 transition-all duration-400 group-hover:translate-x-0.5 group-hover:text-white">
                    ↗
                  </span>
                </a>

                <RevealLayer delay={0.1} distance={18}>
                  <p className="mt-6 text-[13.5px] leading-[1.7] text-white/55">{ch.description}</p>
                </RevealLayer>

                <div className="mt-7 grid flex-1 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-sm bg-line-dark">
                  {channelStats.map((s, i) => (
                    <div key={s.l} className="flex flex-col justify-center bg-ink-2 px-5 py-6">
                      <RevealLayer delay={0.14 + i * 0.08} distance={16}>
                        <p className="display-tight text-3xl font-bold sm:text-4xl">{s.n}</p>
                        <p className="meta mt-2 text-white/45">{s.l}</p>
                      </RevealLayer>
                    </div>
                  ))}
                </div>

                <div className="pt-8">
                  <a
                    href={`${YT_URL}?sub_confirmation=1`}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="view"
                    data-cursor-label="SUB"
                    className="flex w-full items-center justify-center gap-2.5 rounded-sm bg-white px-5 py-4 text-[13px] font-semibold text-ink transition-colors duration-400 hover:bg-vermilion hover:text-white"
                  >
                    <SocialIcon label="YouTube" />
                    Subscribe
                  </a>
                </div>
              </div>
            </Reveal>
          </Parallax>
        </div>

        {/* ── Rest of the recent uploads ── */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {rest.map(({ v, i }, k) => (
            <Reveal
              key={v.video_id || v.title}
              delay={k * 0.09}
              scaleFrom={0.97}
              distance={40}
              className="h-full"
            >
              <_YtCard video={v} index={i} onPlay={() => pick(i)} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
