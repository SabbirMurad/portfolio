/* global React, ReactDOM, gsap, Cursor, Ripple, reducedMotion, profile, Fetcher */
/*
 * Admin sign-in — the new design language applied to the one page behind the
 * portfolio. Same two-panel card as the home page's contact section: form on
 * the left, vermilion gradient panel on the right, same field and button
 * styling, same cursor and click ripple.
 *
 * The POST goes through assets/js/fetcher.js (loaded in sign_in_v2.html
 * before this script) with showError: false — errors are read from the
 * returned FetchResult and shown inline instead of via the toast component
 * this page doesn't load. Fetcher now checks `result.message` before
 * `result.error`, matching src/utils/response.rs's `{ "message": ... }`
 * shape, so the real message ("Incorrect password", etc.) comes through.
 */

/* Where a signed-in admin lands — src/markup.rs `dashboard` re-checks the
   session server-side before rendering it, so this isn't the only guard. */
const AFTER_SIGN_IN = "/admin/dashboard";

/* The shared Reveal/RevealLayer helpers hang their tween on a ScrollTrigger,
   which never fires here: this page is one screen and never scrolls, so the
   trigger sits permanently un-crossed and the content stays at opacity 0. Same
   tween, same easing and stagger units as _revealEntrance in helpers.jsx —
   played on mount instead. */
function Enter(props) {
  const { children, className = "", as = "div" } = props;
  const { from = "bottom", distance = 44, delay = 0, scaleFrom = 0.94 } = props;
  const ref = React.useRef(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const vars = {
      opacity: 0,
      scale: scaleFrom,
      duration: 0.9,
      delay: delay * 0.9,
      ease: "expo.out",
    };
    if (from === "bottom") vars.y = distance;
    else vars.x = from === "left" ? -distance : distance;
    const tween = gsap.from(el, vars);
    return () => tween.kill();
  }, []);

  const Tag = as;
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

const FIELD =
  "w-full rounded-sm border border-line bg-bone px-4 py-3.5 text-[14px] outline-none transition-colors duration-300 placeholder:text-muted focus:border-ink";

function SignIn() {
  const { useState, useEffect } = React;
  const [form, setForm] = useState({ identity: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | pending | done
  const [showPassword, setShowPassword] = useState(false);

  /* No visible "Create account" link anywhere on this page by design — this
     mirrors the Ctrl+Alt+L shortcut in assets/jsx/nav.jsx that gets you here
     in the first place. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        window.location.assign("/admin/sign-up");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((s) => ({ ...s, [k]: undefined }));
    setFormError(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status !== "idle") return;

    const next = {};
    if (!form.identity.trim()) next.identity = "Enter your email address or username";
    if (!form.password) next.password = "Enter your password";
    setErrors(next);
    setFormError(null);
    setNotice(null);
    if (Object.keys(next).length) return;

    setStatus("pending");

    const result = await Fetcher.post({
      endpoint: "/auth/sign-in",
      body: {
        email_or_username: form.identity.trim(),
        password: form.password,
      },
      showError: false,
    });

    if (!result.ok) {
      setStatus("idle");
      setFormError(result.error || "Sign in failed (" + result.status + ")");
      return;
    }

    const payload = result.data;

    /* The handler emails a six-digit code when the account has 2FA on. There is
       no route to submit that code yet — and src/handler/auth/sign_in.rs sends
       two_afa_enabled: false unconditionally, so this branch is currently
       unreachable — but the payload declares the field, so it is handled. */
    if (payload && payload.two_afa_enabled) {
      setStatus("idle");
      setNotice("A verification code was emailed to you. Enter it to finish signing in.");
      return;
    }

    /* The session cookie the server sets is what carries auth from here.
       payload.auth_payload also holds an access/refresh token pair; nothing is
       written to localStorage — where those tokens live is a decision for
       whatever admin UI ends up consuming them. */
    setStatus("done");
    window.setTimeout(() => window.location.assign(AFTER_SIGN_IN), 700);
  };

  const pending = status === "pending";
  const done = status === "done";

  return (
    <main className="grid min-h-screen place-items-center bg-bone px-5 py-10 sm:px-8 sm:py-14">
      <Enter scaleFrom={0.97} className="w-full max-w-[1100px]">
        <div className="grid overflow-hidden rounded-md lg:grid-cols-2">
          {/* ── Form ── */}
          <div className="bg-paper p-8 sm:p-12 lg:p-16">
            <Enter distance={22}>
              <p className="meta text-muted-2">Admin portal</p>
              <h1 className="display-tight mt-3 text-3xl font-bold">Sign in</h1>
            </Enter>

            <Enter delay={0.1} distance={20}>
              <p className="mt-3 max-w-sm text-[14px] leading-[1.7] text-muted-2">
                Accounts here are created by an admin — there is no public sign-up. Use the
                credentials you were given.
              </p>
            </Enter>

            <Enter delay={0.2} distance={18}>
              <form onSubmit={onSubmit} noValidate className="mt-9 space-y-5">
                <div>
                  <label htmlFor="identity" className="meta mb-2 block text-muted-2">
                    Email or username
                  </label>
                  <input
                    id="identity"
                    autoFocus
                    autoComplete="username"
                    value={form.identity}
                    onChange={set("identity")}
                    disabled={pending || done}
                    placeholder="you@example.com"
                    aria-invalid={!!errors.identity}
                    aria-describedby={errors.identity ? "identity-error" : undefined}
                    className={FIELD}
                  />
                  {errors.identity && (
                    <p id="identity-error" className="meta mt-2 text-vermilion">
                      {errors.identity}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="meta mb-2 block text-muted-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={form.password}
                      onChange={set("password")}
                      disabled={pending || done}
                      placeholder="••••••••"
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? "password-error" : undefined}
                      className={FIELD + " pr-20"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-pressed={showPassword}
                      className="meta absolute inset-y-0 right-0 px-4 text-muted-2 transition-colors duration-300 hover:text-ink"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" className="meta mt-2 text-vermilion">
                      {errors.password}
                    </p>
                  )}
                </div>

                {formError && (
                  <p
                    role="alert"
                    className="meta rounded-sm border border-vermilion/30 bg-vermilion/5 px-4 py-3 text-vermilion"
                  >
                    {formError}
                  </p>
                )}

                {notice && (
                  <p
                    role="status"
                    className="meta rounded-sm border border-line bg-bone px-4 py-3 text-muted-2"
                  >
                    {notice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pending || done}
                  /* Only the in-flight state dims. "Signed in" is a result, not
                     a disabled control, so it keeps full contrast. */
                  className={
                    "group flex w-full items-center justify-center gap-3 rounded-sm bg-ink py-4 text-white transition-colors duration-400 " +
                    (done ? "" : pending ? "cursor-default opacity-60" : "hover:bg-vermilion")
                  }
                >
                  <span className="meta">
                    {done ? "Signed in" : pending ? "Signing in…" : "Sign in"}
                  </span>
                  <span className="transition-transform duration-400 group-hover:translate-x-1">
                    {done ? "✓" : "→"}
                  </span>
                </button>
              </form>
            </Enter>

            <Enter delay={0.3} distance={16}>
              <a
                href="/"
                className="meta group mt-8 inline-flex items-center gap-2 text-muted-2 transition-colors duration-300 hover:text-ink"
              >
                <span className="transition-transform duration-400 group-hover:-translate-x-1">
                  ←
                </span>
                Back to the site
              </a>
            </Enter>
          </div>

          {/* ── Gradient panel ── */}
          <div
            data-cursor-theme="dark"
            className="relative flex min-h-[20rem] flex-col justify-between overflow-hidden p-8 text-white sm:p-12 lg:p-16"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 90% at 10% 20%, #de4520 0%, transparent 55%), radial-gradient(100% 80% at 85% 15%, #ff7a3d 0%, transparent 50%), radial-gradient(120% 100% at 70% 90%, #7a1f0c 0%, transparent 60%), #1a0d08",
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.35)_100%)]" />

            <Enter delay={0.12} distance={26} className="relative">
              <a href="/" className="display-tight text-[23px] font-bold tracking-tight">
                {profile.name}
                <sup className="ml-0.5 text-[10px]">®</sup>
              </a>
              <h2 className="display text-display-md mt-10 max-w-[8ch]">Behind the site</h2>
            </Enter>

            <Enter delay={0.28} distance={22} className="relative mt-12">
              <span className="text-2xl text-white">✳</span>
              <p className="meta mt-4 font-semibold">Restricted area</p>
              <p className="mt-3 max-w-xs text-[13px] leading-[1.7] text-white/70">
                This is where the writing, the project entries and the documentation get edited.
                Nothing public lives past this form.
              </p>

              <div className="mt-8">
                <p className="meta text-white/50">Need access?</p>
                <a
                  href={"mailto:" + profile.email}
                  className="mt-1 block text-[14px] transition-colors hover:text-vermilion"
                >
                  {profile.email}
                </a>
              </div>
            </Enter>
          </div>
        </div>
      </Enter>
    </main>
  );
}

function App() {
  return (
    <React.Fragment>
      <Cursor />
      <Ripple />
      <SignIn />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
