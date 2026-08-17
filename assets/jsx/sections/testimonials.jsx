/* global React, Parallax, Reveal, SplitHeading, testimonials */
function _TStars() {
  return (
    <div className="flex gap-1 text-vermilion" aria-label="5 out of 5">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} aria-hidden>
          ★
        </span>
      ))}
    </div>
  );
}

function _TAuthor(props) {
  const t = props.t;
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-bold text-white">
        {t.name.charAt(0)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold">{t.name}</span>
        <span className="meta block truncate text-muted-2">{t.title}</span>
      </span>
    </div>
  );
}

function _TCard(props) {
  const { t, index } = props;
  const authorOnTop = index % 2 === 0;
  return (
    <figure
      className="flex w-[80vw] shrink-0 flex-col gap-5 rounded-sm border border-line bg-paper p-6 sm:w-[24rem]"
      style={{ marginTop: authorOnTop ? 0 : "4.5rem" }}
    >
      {authorOnTop ? (
        <React.Fragment>
          <_TAuthor t={t} />
          <hr className="border-line" />
          <_TStars />
          <blockquote className="text-[14.5px] leading-[1.7] text-ink/80">
            &ldquo;{t.quote}&rdquo;
          </blockquote>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <_TStars />
          <blockquote className="text-[14.5px] leading-[1.7] text-ink/80">
            &ldquo;{t.quote}&rdquo;
          </blockquote>
          <hr className="mt-auto border-line" />
          <_TAuthor t={t} />
        </React.Fragment>
      )}
    </figure>
  );
}

function Testimonials() {
  const row = [...testimonials, ...testimonials];
  return (
    <section id="testimonials" className="overflow-hidden bg-bone py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <SplitHeading
              as="h2"
              text="Words from the people I build for"
              className="display text-display-lg max-w-[12ch]"
            />
          </div>
          <Reveal from="right" delay={0.1}>
            <p className="max-w-sm text-[14px] leading-[1.75] text-muted-2">
              Clear communication, honest estimates, and working builds at every milestone — the
              things people actually remember afterwards.
            </p>
          </Reveal>
        </div>
      </div>

      <Parallax amount={24} className="mt-16">
        <Reveal delay={0.12} scaleFrom={1} className="marquee-paused relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bone to-transparent sm:w-32" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bone to-transparent sm:w-32" />

          <div
            className="animate-marquee flex w-max items-start gap-6 pr-6"
            style={{ "--marquee-duration": "60s" }}
          >
            {row.map((t, i) => (
              <_TCard key={t.name + "-" + i} t={t} index={i} />
            ))}
          </div>
        </Reveal>
      </Parallax>
    </section>
  );
}
