/* global React, Parallax, Reveal, RevealLayer, profile */
function Contact() {
  const { useState } = React;
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = "Please enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Please enter a valid email";
    if (form.message.trim().length < 10) next.message = "Tell me a little more (10+ characters)";
    setErrors(next);
    if (Object.keys(next).length) return;

    const subject = encodeURIComponent(`Project enquiry from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name}\n${form.email}`);
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
  };

  const field =
    "w-full rounded-sm border border-line bg-bone px-4 py-3.5 text-[14px] outline-none transition-colors duration-300 placeholder:text-muted focus:border-ink";

  return (
    <section id="contact" className="bg-bone px-5 pb-24 sm:px-8 sm:pb-32 lg:px-12 lg:pb-40">
      <div className="mx-auto max-w-[1600px]">
        <Reveal scaleFrom={0.97} className="grid overflow-hidden rounded-md lg:grid-cols-2">
          {/* Form */}
          <div className="bg-paper p-8 sm:p-12 lg:p-16">
            <RevealLayer distance={22}>
              <h2 className="display-tight text-3xl font-bold">Reach out to me</h2>
            </RevealLayer>
            <RevealLayer delay={0.1} distance={20}>
              <p className="mt-3 max-w-sm text-[14px] leading-[1.7] text-muted-2">
                Tell me what you&apos;re building and I&apos;ll come back with an honest read on
                scope, timeline, and whether I&apos;m the right fit.
              </p>
            </RevealLayer>

            <RevealLayer delay={0.2} distance={18} as="div">
              <form onSubmit={onSubmit} noValidate className="mt-9 space-y-5">
                <div>
                  <label htmlFor="name" className="meta mb-2 block text-muted-2">
                    Name
                  </label>
                  <input
                    id="name"
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Jane Smith"
                    aria-invalid={!!errors.name}
                    className={field}
                  />
                  {errors.name && <p className="meta mt-2 text-vermilion">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="meta mb-2 block text-muted-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="jane@company.com"
                    aria-invalid={!!errors.email}
                    className={field}
                  />
                  {errors.email && <p className="meta mt-2 text-vermilion">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="message" className="meta mb-2 block text-muted-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={form.message}
                    onChange={set("message")}
                    placeholder="A short description of the project…"
                    aria-invalid={!!errors.message}
                    className={`${field} resize-none`}
                  />
                  {errors.message && <p className="meta mt-2 text-vermilion">{errors.message}</p>}
                </div>

                <button
                  type="submit"
                  className="group flex w-full items-center justify-center gap-3 rounded-sm bg-ink py-4 text-white transition-colors duration-400 hover:bg-vermilion"
                >
                  <span className="meta">Send your message</span>
                  <span className="transition-transform duration-400 group-hover:translate-x-1">→</span>
                </button>
              </form>
            </RevealLayer>
          </div>

          {/* Gradient panel */}
          <div
            data-cursor-theme="dark"
            className="relative flex min-h-[24rem] flex-col justify-between overflow-hidden p-8 text-white sm:p-12 lg:p-16"
          >
            <Parallax amount={30} className="absolute inset-x-0 -inset-y-[12%]">
              <div
                className="h-full w-full"
                style={{
                  background:
                    "radial-gradient(120% 90% at 10% 20%, #de4520 0%, transparent 55%), radial-gradient(100% 80% at 85% 15%, #ff7a3d 0%, transparent 50%), radial-gradient(120% 100% at 70% 90%, #7a1f0c 0%, transparent 60%), #1a0d08",
                }}
              />
            </Parallax>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.35)_100%)]" />

            <RevealLayer delay={0.12} distance={26} className="relative">
              <h2 className="display text-display-lg max-w-[9ch]">Let&apos;s create together</h2>
            </RevealLayer>

            <RevealLayer delay={0.28} distance={22} className="relative mt-12">
              <span className="text-2xl text-white">✳</span>
              <p className="meta mt-4 font-semibold">Results-driven solutions</p>
              <p className="mt-3 max-w-xs text-[13px] leading-[1.7] text-white/70">
                Refined through feedback and testing to make sure the result holds up for the
                people who actually use it.
              </p>

              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="meta text-white/50">Email</p>
                  <a
                    href={`mailto:${profile.email}`}
                    className="mt-1 block text-[14px] transition-colors hover:text-vermilion"
                  >
                    {profile.email}
                  </a>
                </div>
                <div>
                  <p className="meta text-white/50">Open hours</p>
                  <p className="mt-1 text-[14px]">{profile.hours}</p>
                </div>
              </div>
            </RevealLayer>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
