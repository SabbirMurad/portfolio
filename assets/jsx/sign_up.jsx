/* global React, ReactDOM, gsap, Cursor, Ripple, reducedMotion, profile, Fetcher */
/*
 * Admin sign-up — companion to sign_in.jsx, same two-panel card and field
 * styling. Reachable only via the hidden Ctrl+Alt+N shortcut on the sign-in
 * page (see sign_in.jsx); there is no visible link to it anywhere on the
 * public site.
 *
 * The API (POST /api/auth/sign-up) verifies the account through the
 * `secret_key` field against SIGN_UP_SECRET_KEY in the server's .env file
 * instead of an email code — src/handler/auth/sign_up.rs rejects a wrong or
 * missing key with 403 before touching the database. A successful sign-up
 * does not sign you in (no tokens/session are issued here), so this sends
 * you on to /admin/sign-in afterward.
 */

const AFTER_SIGN_UP = "/admin/sign-in";

/* Same mount-time reveal used on the sign-in page — this page is one screen
   and never scrolls, so a ScrollTrigger-based reveal would never fire. */
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

// Two-per-row so the form fits one screen: name/username, email/secret key,
// password/confirm password.
const NAME_FIELDS = [
  { key: "full_name", label: "Full name", type: "text", autoComplete: "name", placeholder: "Sabbir Hassan" },
  { key: "username", label: "Username", type: "text", autoComplete: "username", placeholder: "sabbirhassan" },
];

const REQUIRED_MESSAGE = {
  full_name: "Enter your full name",
  username: "Choose a username",
  email_address: "Enter your email address",
  password: "Choose a password",
  confirm_password: "Confirm your password",
  secret_key: "Enter the secret key",
};

function SignUp() {
  const { useState } = React;
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email_address: "",
    password: "",
    confirm_password: "",
    secret_key: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | pending | done
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

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
    Object.keys(REQUIRED_MESSAGE).forEach((k) => {
      if (!form[k].trim()) next[k] = REQUIRED_MESSAGE[k];
    });
    if (form.password && form.confirm_password && form.password !== form.confirm_password) {
      next.confirm_password = "Passwords do not match";
    }
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setStatus("pending");

    const result = await Fetcher.post({
      endpoint: "/auth/sign-up",
      body: {
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email_address: form.email_address.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
        secret_key: form.secret_key,
      },
      showError: false,
    });

    if (!result.ok) {
      setStatus("idle");
      setFormError(result.error || "Sign up failed (" + result.status + ")");
      return;
    }

    setStatus("done");
    window.setTimeout(() => window.location.assign(AFTER_SIGN_UP), 700);
  };

  const pending = status === "pending";
  const done = status === "done";

  return (
    <main className="grid min-h-screen place-items-center bg-bone px-5 py-6 sm:px-8 sm:py-8">
      <Enter scaleFrom={0.97} className="w-full max-w-[1100px]">
        <div className="grid overflow-hidden rounded-md lg:grid-cols-2">
          {/* ── Form ── */}
          <div className="bg-paper p-8 sm:p-10 lg:p-12">
            <Enter distance={22}>
              <p className="meta text-muted-2">Admin portal</p>
              <h1 className="display-tight mt-2 text-3xl font-bold">Create account</h1>
            </Enter>

            <Enter delay={0.1} distance={20}>
              <p className="mt-2 max-w-sm text-[14px] leading-[1.6] text-muted-2">
                Verified instantly by the secret key below — no email step.
              </p>
            </Enter>

            <Enter delay={0.2} distance={18}>
              <form onSubmit={onSubmit} noValidate className="mt-7 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {NAME_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label htmlFor={f.key} className="meta mb-2 block text-muted-2">
                        {f.label}
                      </label>
                      <input
                        id={f.key}
                        type={f.type}
                        autoComplete={f.autoComplete}
                        value={form[f.key]}
                        onChange={set(f.key)}
                        disabled={pending || done}
                        placeholder={f.placeholder}
                        aria-invalid={!!errors[f.key]}
                        aria-describedby={errors[f.key] ? f.key + "-error" : undefined}
                        className={FIELD}
                      />
                      {errors[f.key] && (
                        <p id={f.key + "-error"} className="meta mt-2 text-vermilion">
                          {errors[f.key]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label htmlFor="email_address" className="meta mb-2 block text-muted-2">
                    Email address
                  </label>
                  <input
                    id="email_address"
                    type="email"
                    autoComplete="email"
                    value={form.email_address}
                    onChange={set("email_address")}
                    disabled={pending || done}
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email_address}
                    aria-describedby={errors.email_address ? "email_address-error" : undefined}
                    className={FIELD}
                  />
                  {errors.email_address && (
                    <p id="email_address-error" className="meta mt-2 text-vermilion">
                      {errors.email_address}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="secret_key" className="meta mb-2 block text-muted-2">
                    Secret key
                  </label>
                  <div className="relative">
                    <input
                      id="secret_key"
                      type={showSecret ? "text" : "password"}
                      autoComplete="off"
                      value={form.secret_key}
                      onChange={set("secret_key")}
                      disabled={pending || done}
                      placeholder="••••••••"
                      aria-invalid={!!errors.secret_key}
                      aria-describedby={errors.secret_key ? "secret_key-error" : undefined}
                      className={FIELD + " pr-14"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      aria-pressed={showSecret}
                      className="meta absolute inset-y-0 right-0 px-3 text-muted-2 transition-colors duration-300 hover:text-ink"
                    >
                      {showSecret ? "Hide" : "Show"}
                    </button>
                  </div>
                  {errors.secret_key && (
                    <p id="secret_key-error" className="meta mt-2 text-vermilion">
                      {errors.secret_key}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="meta mb-2 block text-muted-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={set("password")}
                        disabled={pending || done}
                        placeholder="••••••••"
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? "password-error" : undefined}
                        className={FIELD + " pr-14"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-pressed={showPassword}
                        className="meta absolute inset-y-0 right-0 px-3 text-muted-2 transition-colors duration-300 hover:text-ink"
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

                  <div>
                    <label htmlFor="confirm_password" className="meta mb-2 block text-muted-2">
                      Confirm password
                    </label>
                    <input
                      id="confirm_password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.confirm_password}
                      onChange={set("confirm_password")}
                      disabled={pending || done}
                      placeholder="••••••••"
                      aria-invalid={!!errors.confirm_password}
                      aria-describedby={errors.confirm_password ? "confirm_password-error" : undefined}
                      className={FIELD}
                    />
                    {errors.confirm_password && (
                      <p id="confirm_password-error" className="meta mt-2 text-vermilion">
                        {errors.confirm_password}
                      </p>
                    )}
                  </div>
                </div>

                {formError && (
                  <p
                    role="alert"
                    className="meta rounded-sm border border-vermilion/30 bg-vermilion/5 px-4 py-3 text-vermilion"
                  >
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pending || done}
                  className={
                    "group flex w-full items-center justify-center gap-3 rounded-sm bg-ink py-4 text-white transition-colors duration-400 " +
                    (done ? "" : pending ? "cursor-default opacity-60" : "hover:bg-vermilion")
                  }
                >
                  <span className="meta">
                    {done ? "Account created" : pending ? "Creating…" : "Create account"}
                  </span>
                  <span className="transition-transform duration-400 group-hover:translate-x-1">
                    {done ? "✓" : "→"}
                  </span>
                </button>
              </form>
            </Enter>

            <Enter delay={0.3} distance={16}>
              <a
                href="/admin/sign-in"
                className="meta group mt-6 inline-flex items-center gap-2 text-muted-2 transition-colors duration-300 hover:text-ink"
              >
                <span className="transition-transform duration-400 group-hover:-translate-x-1">
                  ←
                </span>
                Back to sign in
              </a>
            </Enter>
          </div>

          {/* ── Gradient panel ── */}
          <div
            data-cursor-theme="dark"
            className="relative flex min-h-[20rem] flex-col justify-between overflow-hidden p-8 text-white sm:p-10 lg:p-12"
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
              <h2 className="display text-display-md mt-10 max-w-[8ch]">One key in</h2>
            </Enter>

            <Enter delay={0.28} distance={22} className="relative mt-12">
              <p className="meta mt-4 font-semibold">Restricted area</p>
              <p className="mt-3 max-w-xs text-[13px] leading-[1.7] text-white/70">
                Anyone can submit this form, but only a request carrying the correct secret key
                ever becomes an account. Everyone else gets rejected before the database is
                touched.
              </p>
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
      <SignUp />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
