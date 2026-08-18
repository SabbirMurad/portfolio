/* global React, ReactDOM, gsap, Cursor, Ripple, reducedMotion, profile, Fetcher */
/*
 * Admin dashboard — lands here after a successful /admin/sign-in. The route
 * itself is guarded server-side (src/markup.rs `dashboard`): no live session
 * means a redirect to /admin/sign-in before this ever renders, so there is no
 * client-side auth check to duplicate here.
 *
 * `full_name` is looked up from account_profile by the server and handed
 * over as a data attribute on <body> (see pages/dashboard.html) rather
 * than fetched again client-side.
 *
 * Sidebar + tab layout: one page, tabs switch content client-side (no
 * routing) rather than separate /admin/dashboard/* pages, since the whole
 * app is a single Tera-rendered shell around one React root.
 */

const AFTER_SIGN_OUT = "/admin/sign-in";

const NAV_ITEMS = [
  { key: "overview", label: "Overview" },
  { key: "documentation", label: "Documentation" },
  { key: "writing", label: "Writing" },
  { key: "projects", label: "Projects" },
  { key: "youtube", label: "YouTube" },
];

function Enter(props) {
  const { children, className = "", as = "div" } = props;
  const { from = "bottom", distance = 28, delay = 0, scaleFrom = 0.97 } = props;
  const ref = React.useRef(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const vars = {
      opacity: 0,
      scale: scaleFrom,
      duration: 0.8,
      delay: delay * 0.85,
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

/* ── Sidebar ─────────────────────────────────────────────────────────── */

function Sidebar({ active, onSelect, onSignOut, signingOut }) {
  return (
    <aside className="border-b border-line bg-paper lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:sticky lg:top-0 lg:flex lg:flex-col">
      <div className="flex h-[var(--nav-h)] items-center px-5 lg:px-6">
        <a href="/" className="display-tight text-[20px] font-bold tracking-tight text-ink">
          {profile.name}
          <sup className="ml-0.5 text-[10px]">®</sup>
        </a>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0 lg:pt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={
                "meta shrink-0 rounded-sm px-3 py-2.5 text-left transition-colors duration-300 lg:w-full " +
                (isActive
                  ? "bg-ink text-white"
                  : "text-muted-2 hover:bg-bone hover:text-ink")
              }
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="meta w-full rounded-sm border border-line px-3 py-2.5 text-muted-2 transition-colors duration-300 hover:border-ink hover:text-ink disabled:opacity-60"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}

/* ── Overview tab ────────────────────────────────────────────────────── */

function OverviewTab({ fullName, onSelect }) {
  return (
    <Enter distance={20}>
      <p className="meta text-muted-2">Admin portal</p>
      <h1 className="display-tight mt-3 text-3xl font-bold sm:text-4xl">
        Welcome back, {fullName}
      </h1>
      <p className="mt-3 max-w-lg text-[14px] leading-[1.7] text-muted-2">
        Documentation, Projects and the home page's YouTube picks are live. Writing is still
        coming.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {NAV_ITEMS.filter((i) => i.key !== "overview").map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className="rounded-md border border-line bg-paper p-5 text-left transition-colors duration-300 hover:border-ink"
          >
            <span className="meta text-vermilion">{item.label}</span>
            <span className="mt-2 flex items-center gap-2 text-[14px] font-semibold text-ink">
              Open
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </span>
          </button>
        ))}
      </div>
    </Enter>
  );
}

/* ── Coming-soon tabs ────────────────────────────────────────────────── */

function ComingSoonTab({ label, title, body }) {
  return (
    <Enter distance={18}>
      <div className="max-w-lg rounded-md border border-line bg-paper p-6 sm:p-8">
        <p className="meta text-vermilion">{label}</p>
        <h2 className="display-tight mt-3 text-xl font-bold">{title}</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-muted-2">{body}</p>
        <p className="meta mt-5 text-muted">Coming soon</p>
      </div>
    </Enter>
  );
}

/* ── Documentation tab ───────────────────────────────────────────────── */

// POST /documentation (Fetcher prefixes /api itself) JSON-encodes the zip as
// a plain byte array (see RequestBody.file: Vec<u8> in
// src/handler/documentation/create.rs), which runs ~4-5x larger than the raw
// file once stringified. The server accepts up to 64MB of JSON for this
// route, so keep some margin under that.
const MAX_ZIP_BYTES = 12 * 1024 * 1024;

function Switch({ on, onToggle, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      disabled={disabled}
      className={
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-60 " +
        (on ? "bg-vermilion" : "bg-line")
      }
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300"
        style={{ transform: on ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function CreateDocumentation({ onCreated, onCancel }) {
  const { useState } = React;
  const [form, setForm] = useState({ title: "", description: "", tags: "" });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | pending

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((s) => ({ ...s, [k]: undefined }));
    setFormError(null);
  };

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
    setErrors((s) => ({ ...s, file: undefined }));
    setFormError(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === "pending") return;

    const next = {};
    if (!form.title.trim()) next.title = "Enter a title";
    if (!form.description.trim()) next.description = "Enter a description";
    if (!file) next.file = "Choose a zip file";
    else if (!file.name.toLowerCase().endsWith(".zip")) next.file = "Must be a .zip file";
    else if (file.size > MAX_ZIP_BYTES) {
      next.file = "Zip is too large (max " + Math.floor(MAX_ZIP_BYTES / (1024 * 1024)) + "MB)";
    }
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setStatus("pending");

    let bytes;
    try {
      const buffer = await file.arrayBuffer();
      bytes = Array.from(new Uint8Array(buffer));
    } catch (err) {
      setStatus("idle");
      setFormError("Could not read that file. Try picking it again.");
      return;
    }

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await Fetcher.post({
      endpoint: "/documentation",
      body: {
        name: form.title.trim(),
        description: form.description.trim(),
        tags,
        file: bytes,
      },
      showError: false,
    });

    if (!result.ok) {
      setStatus("idle");
      setFormError(result.error || "Failed to create (" + result.status + ")");
      return;
    }

    setStatus("idle");
    onCreated({
      uuid: result.data.uuid,
      name: result.data.name,
      description: form.description.trim(),
      tags,
      featured: false,
      created_at: Date.now(),
    });
  };

  const pending = status === "pending";

  return (
    <div className="rounded-md border border-line bg-paper p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="meta text-vermilion">New entry</p>
          <h2 className="display-tight mt-2 text-xl font-bold">Create a doc entry</h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="meta text-muted-2 transition-colors duration-300 hover:text-ink"
        >
          Cancel
        </button>
      </div>
      <p className="mt-2 max-w-lg text-[14px] leading-[1.7] text-muted-2">
        Verified instantly, no email step. The zip becomes the doc site itself.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="doc-title" className="meta mb-2 block text-muted-2">
            Title
          </label>
          <input
            id="doc-title"
            value={form.title}
            onChange={set("title")}
            disabled={pending}
            placeholder="Hyper API Reference"
            aria-invalid={!!errors.title}
            className={FIELD}
          />
          {errors.title && <p className="meta mt-2 text-vermilion">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="doc-description" className="meta mb-2 block text-muted-2">
            Description
          </label>
          <textarea
            id="doc-description"
            value={form.description}
            onChange={set("description")}
            disabled={pending}
            rows={3}
            placeholder="What this documentation covers"
            aria-invalid={!!errors.description}
            className={FIELD + " resize-none"}
          />
          {errors.description && <p className="meta mt-2 text-vermilion">{errors.description}</p>}
        </div>

        <div>
          <label htmlFor="doc-tags" className="meta mb-2 block text-muted-2">
            Tags
          </label>
          <input
            id="doc-tags"
            value={form.tags}
            onChange={set("tags")}
            disabled={pending}
            placeholder="Rust, OpenAPI, MkDocs"
            className={FIELD}
          />
          <p className="meta mt-2 text-muted">Comma-separated</p>
        </div>

        <div>
          <label htmlFor="doc-zip" className="meta mb-2 block text-muted-2">
            Zip file
          </label>
          <input
            id="doc-zip"
            type="file"
            accept=".zip"
            onChange={onFile}
            disabled={pending}
            aria-invalid={!!errors.file}
            className="meta block w-full text-muted-2 file:mr-4 file:rounded-sm file:border-0 file:bg-ink file:px-4 file:py-2.5 file:text-[13px] file:font-semibold file:text-white file:transition-colors file:duration-300 hover:file:bg-vermilion"
          />
          {errors.file && <p className="meta mt-2 text-vermilion">{errors.file}</p>}
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
          disabled={pending}
          className={
            "group flex items-center justify-center gap-3 rounded-sm bg-ink px-6 py-3.5 text-white transition-colors duration-400 " +
            (pending ? "cursor-default opacity-60" : "hover:bg-vermilion")
          }
        >
          <span className="meta">{pending ? "Creating…" : "Create documentation"}</span>
          <span className="transition-transform duration-400 group-hover:translate-x-1">→</span>
        </button>
      </form>
    </div>
  );
}

function DocRow({ doc, onToggle, toggling }) {
  const date = new Date(doc.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-4 border-b border-line py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={"/documentation/" + doc.name + "/"}
            target="_blank"
            rel="noreferrer"
            className="text-[15px] font-semibold text-ink transition-colors duration-300 hover:text-vermilion"
          >
            {doc.name}
          </a>
          <span className="meta text-muted">{date}</span>
        </div>
        <p className="mt-1 max-w-xl truncate text-[13px] text-muted-2">{doc.description}</p>
        {doc.tags && doc.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {doc.tags.map((t) => (
              <span
                key={t}
                className="meta rounded-sm bg-bone px-2 py-1 text-muted-2"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:pl-6">
        <span className="meta text-muted-2">Shown on home</span>
        <Switch
          on={!!doc.featured}
          disabled={toggling}
          label={"Show " + doc.name + " on the home page"}
          onToggle={() => onToggle(doc)}
        />
      </div>
    </div>
  );
}

function DocumentationTab() {
  const { useState, useEffect, useMemo } = React;
  const [docs, setDocs] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [togglingUuid, setTogglingUuid] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const result = await Fetcher.get({ endpoint: "/documentation", showError: false });
      if (!alive) return;
      if (!result.ok) {
        setLoadState("error");
        setLoadError(result.error || "Failed to load documentation");
        return;
      }
      setDocs(result.data || []);
      setLoadState("ready");
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => {
      const haystack = [d.name, d.description, ...(d.tags || [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [docs, search]);

  const onCreated = (doc) => {
    setDocs((prev) => [doc, ...prev]);
    setShowCreate(false);
  };

  const onToggle = async (doc) => {
    setTogglingUuid(doc.uuid);
    const next = !doc.featured;
    setDocs((prev) => prev.map((d) => (d.uuid === doc.uuid ? { ...d, featured: next } : d)));

    const result = await Fetcher.patch({
      endpoint: "/documentation/" + doc.uuid + "/featured",
      body: { featured: next },
      showError: false,
    });

    if (!result.ok) {
      // Roll back — the doc site couldn't record the change.
      setDocs((prev) => prev.map((d) => (d.uuid === doc.uuid ? { ...d, featured: !next } : d)));
    }
    setTogglingUuid(null);
  };

  return (
    <Enter distance={18}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="meta text-vermilion">Documentation</p>
          <h1 className="display-tight mt-2 text-2xl font-bold sm:text-3xl">Docs library</h1>
        </div>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="group flex items-center gap-2 rounded-sm bg-ink px-5 py-3 text-white transition-colors duration-300 hover:bg-vermilion"
          >
            <span className="meta">New documentation</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">+</span>
          </button>
        )}
      </div>

      {showCreate && (
        <div className="mt-6">
          <CreateDocumentation onCreated={onCreated} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      <div className="mt-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, description or tag…"
          className={FIELD + " max-w-md"}
        />
      </div>

      <div className="mt-6 rounded-md border border-line bg-paper px-5 sm:px-6">
        {loadState === "loading" && (
          <p className="meta py-8 text-center text-muted-2">Loading…</p>
        )}

        {loadState === "error" && (
          <p className="meta py-8 text-center text-vermilion">{loadError}</p>
        )}

        {loadState === "ready" && filtered.length === 0 && (
          <p className="meta py-8 text-center text-muted-2">
            {docs.length === 0 ? "No documentation yet." : "Nothing matches that search."}
          </p>
        )}

        {loadState === "ready" &&
          filtered.map((doc) => (
            <DocRow
              key={doc.uuid}
              doc={doc}
              toggling={togglingUuid === doc.uuid}
              onToggle={onToggle}
            />
          ))}
      </div>
    </Enter>
  );
}

/* ── Projects tab ────────────────────────────────────────────────────── */

// Mirrors MAX_ZIP_BYTES above — this one guards the thumbnail upload against
// src/handler/image/upload.rs's own 8MB cap (MAX_FILE_BYTES there), so a
// too-large image fails fast instead of after a slow upload.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function CreateProject({ onCreated, onCancel }) {
  const { useState } = React;
  const [form, setForm] = useState({ title: "", subtitle: "", description: "", tags: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | pending

  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageId, setImageId] = useState(null);
  const [imageState, setImageState] = useState("idle"); // idle | uploading | done | error
  const [imageError, setImageError] = useState(null);

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((s) => ({ ...s, [k]: undefined }));
    setFormError(null);
  };

  const onImageFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setImageError(null);
    setImageId(null);
    setErrors((s) => ({ ...s, image: undefined }));

    if (!file.type.startsWith("image/")) {
      setImageState("error");
      setImageError("That's not an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageState("error");
      setImageError("Image is too large (max " + Math.floor(MAX_IMAGE_BYTES / (1024 * 1024)) + "MB)");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setImageState("uploading");

    const formData = new FormData();
    formData.append("image", file);

    const result = await Fetcher.upload({
      endpoint: "/image/upload",
      formData,
      showError: false,
    });

    if (!result.ok) {
      setImageState("error");
      setImageError(result.error || "Upload failed");
      return;
    }

    setImageId(result.data.uuid);
    setImageState("done");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === "pending") return;

    const next = {};
    if (!form.title.trim()) next.title = "Enter a title";
    if (!form.subtitle.trim()) next.subtitle = "Enter a subtitle";
    if (!form.description.trim()) next.description = "Enter a description";
    if (!imageId) next.image = "Upload a thumbnail image";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setStatus("pending");

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await Fetcher.post({
      endpoint: "/project",
      body: {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        tags,
        image_id: imageId,
      },
      showError: false,
    });

    if (!result.ok) {
      setStatus("idle");
      setFormError(result.error || "Failed to create (" + result.status + ")");
      return;
    }

    setStatus("idle");
    onCreated({
      uuid: result.data.uuid,
      title: result.data.title,
      subtitle: form.subtitle.trim(),
      description: form.description.trim(),
      tags,
      image_id: imageId,
      featured: false,
      created_at: Date.now(),
    });
  };

  const pending = status === "pending";
  const uploading = imageState === "uploading";

  return (
    <div className="rounded-md border border-line bg-paper p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="meta text-vermilion">New entry</p>
          <h2 className="display-tight mt-2 text-xl font-bold">Create a project</h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="meta text-muted-2 transition-colors duration-300 hover:text-ink"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="project-thumb" className="meta mb-2 block text-muted-2">
            Thumbnail
          </label>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line bg-bone">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="meta text-muted">No image</span>
              )}
            </div>
            <div className="min-w-0">
              <input
                id="project-thumb"
                type="file"
                accept="image/*"
                onChange={onImageFile}
                disabled={pending}
                className="meta block text-muted-2 file:mr-4 file:rounded-sm file:border-0 file:bg-ink file:px-4 file:py-2.5 file:text-[13px] file:font-semibold file:text-white file:transition-colors file:duration-300 hover:file:bg-vermilion"
              />
              {imageState === "uploading" && (
                <p className="meta mt-2 text-muted-2">Uploading…</p>
              )}
              {imageState === "done" && <p className="meta mt-2 text-muted-2">Uploaded ✓</p>}
              {imageState === "error" && (
                <p className="meta mt-2 text-vermilion">{imageError}</p>
              )}
            </div>
          </div>
          {errors.image && <p className="meta mt-2 text-vermilion">{errors.image}</p>}
        </div>

        <div>
          <label htmlFor="project-title" className="meta mb-2 block text-muted-2">
            Title
          </label>
          <input
            id="project-title"
            value={form.title}
            onChange={set("title")}
            disabled={pending}
            placeholder="Hyper"
            aria-invalid={!!errors.title}
            className={FIELD}
          />
          {errors.title && <p className="meta mt-2 text-vermilion">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="project-subtitle" className="meta mb-2 block text-muted-2">
            Subtitle
          </label>
          <input
            id="project-subtitle"
            value={form.subtitle}
            onChange={set("subtitle")}
            disabled={pending}
            placeholder="Async Task Queue"
            aria-invalid={!!errors.subtitle}
            className={FIELD}
          />
          {errors.subtitle && <p className="meta mt-2 text-vermilion">{errors.subtitle}</p>}
        </div>

        <div>
          <label htmlFor="project-description" className="meta mb-2 block text-muted-2">
            Description
          </label>
          <textarea
            id="project-description"
            value={form.description}
            onChange={set("description")}
            disabled={pending}
            rows={3}
            placeholder="What this project is and does"
            aria-invalid={!!errors.description}
            className={FIELD + " resize-none"}
          />
          {errors.description && <p className="meta mt-2 text-vermilion">{errors.description}</p>}
        </div>

        <div>
          <label htmlFor="project-tags" className="meta mb-2 block text-muted-2">
            Tags
          </label>
          <input
            id="project-tags"
            value={form.tags}
            onChange={set("tags")}
            disabled={pending}
            placeholder="Rust, Tokio, RocksDB"
            className={FIELD}
          />
          <p className="meta mt-2 text-muted">Comma-separated</p>
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
          disabled={pending || uploading}
          className={
            "group flex items-center justify-center gap-3 rounded-sm bg-ink px-6 py-3.5 text-white transition-colors duration-400 " +
            (pending || uploading ? "cursor-default opacity-60" : "hover:bg-vermilion")
          }
        >
          <span className="meta">{pending ? "Creating…" : "Create project"}</span>
          <span className="transition-transform duration-400 group-hover:translate-x-1">→</span>
        </button>
      </form>
    </div>
  );
}

function ProjectRow({ project, onToggle, toggling }) {
  const date = new Date(project.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-4 border-b border-line py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-4">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-sm border border-line bg-bone">
          <img
            src={"/image/webp/" + project.image_id}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">{project.title}</span>
            <span className="meta text-muted-2">{project.subtitle}</span>
            <span className="meta text-muted">{date}</span>
          </div>
          <p className="mt-1 max-w-xl truncate text-[13px] text-muted-2">{project.description}</p>
          {project.tags && project.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {project.tags.map((t) => (
                <span key={t} className="meta rounded-sm bg-bone px-2 py-1 text-muted-2">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:pl-6">
        <span className="meta text-muted-2">Shown on home</span>
        <Switch
          on={!!project.featured}
          disabled={toggling}
          label={"Show " + project.title + " on the home page"}
          onToggle={() => onToggle(project)}
        />
      </div>
    </div>
  );
}

function ProjectsTab() {
  const { useState, useEffect, useMemo } = React;
  const [projects, setProjects] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [togglingUuid, setTogglingUuid] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const result = await Fetcher.get({ endpoint: "/project", showError: false });
      if (!alive) return;
      if (!result.ok) {
        setLoadState("error");
        setLoadError(result.error || "Failed to load projects");
        return;
      }
      setProjects(result.data || []);
      setLoadState("ready");
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      const haystack = [p.title, p.subtitle, p.description, ...(p.tags || [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, search]);

  const onCreated = (project) => {
    setProjects((prev) => [project, ...prev]);
    setShowCreate(false);
  };

  const onToggle = async (project) => {
    setTogglingUuid(project.uuid);
    const next = !project.featured;
    setProjects((prev) =>
      prev.map((p) => (p.uuid === project.uuid ? { ...p, featured: next } : p))
    );

    const result = await Fetcher.patch({
      endpoint: "/project/" + project.uuid + "/featured",
      body: { featured: next },
      showError: false,
    });

    if (!result.ok) {
      setProjects((prev) =>
        prev.map((p) => (p.uuid === project.uuid ? { ...p, featured: !next } : p))
      );
    }
    setTogglingUuid(null);
  };

  return (
    <Enter distance={18}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="meta text-vermilion">Projects</p>
          <h1 className="display-tight mt-2 text-2xl font-bold sm:text-3xl">Project entries</h1>
        </div>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="group flex items-center gap-2 rounded-sm bg-ink px-5 py-3 text-white transition-colors duration-300 hover:bg-vermilion"
          >
            <span className="meta">New project</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">+</span>
          </button>
        )}
      </div>

      {showCreate && (
        <div className="mt-6">
          <CreateProject onCreated={onCreated} onCancel={() => setShowCreate(false)} />
        </div>
      )}

      <div className="mt-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, subtitle, description or tag…"
          className={FIELD + " max-w-md"}
        />
      </div>

      <div className="mt-6 rounded-md border border-line bg-paper px-5 sm:px-6">
        {loadState === "loading" && (
          <p className="meta py-8 text-center text-muted-2">Loading…</p>
        )}

        {loadState === "error" && (
          <p className="meta py-8 text-center text-vermilion">{loadError}</p>
        )}

        {loadState === "ready" && filtered.length === 0 && (
          <p className="meta py-8 text-center text-muted-2">
            {projects.length === 0 ? "No projects yet." : "Nothing matches that search."}
          </p>
        )}

        {loadState === "ready" &&
          filtered.map((project) => (
            <ProjectRow
              key={project.uuid}
              project={project}
              toggling={togglingUuid === project.uuid}
              onToggle={onToggle}
            />
          ))}
      </div>
    </Enter>
  );
}

/* ── YouTube tab ─────────────────────────────────────────────────────── */

// One primary slot, up to three secondary ones — matches
// src/model/youtube.rs FeaturedVideos and what the home page's YouTube
// section actually renders (assets/jsx/sections/youtube.jsx: videos[0] is
// the big player, the rest fill the row of cards underneath).
const SECONDARY_SLOTS = 3;

function YoutubeTab() {
  const { useState, useEffect } = React;
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState(["", "", ""]);
  const [status, setStatus] = useState("idle"); // idle | saving
  const [formError, setFormError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const result = await Fetcher.get({ endpoint: "/youtube/featured", showError: false });
      if (!alive) return;
      if (!result.ok) {
        setLoadState("error");
        setLoadError(result.error || "Failed to load");
        return;
      }
      const data = result.data || {};
      setPrimary(data.primary_video_id || "");
      const subs = data.secondary_video_ids || [];
      setSecondary([subs[0] || "", subs[1] || "", subs[2] || ""]);
      setLoadState("ready");
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setSlot = (i) => (e) => {
    const v = e.target.value;
    setSecondary((s) => s.map((x, k) => (k === i ? v : x)));
    setFormError(null);
    setSaved(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === "saving") return;

    setStatus("saving");
    setFormError(null);
    setSaved(false);

    const result = await Fetcher.post({
      endpoint: "/youtube/featured",
      body: {
        primary_video_id: primary.trim(),
        secondary_video_ids: secondary.map((s) => s.trim()).filter(Boolean),
      },
      showError: false,
    });

    if (!result.ok) {
      setStatus("idle");
      setFormError(result.error || "Failed to save");
      return;
    }

    setStatus("idle");
    setSaved(true);
  };

  const onClear = () => {
    setPrimary("");
    setSecondary(["", "", ""]);
    setFormError(null);
    setSaved(false);
  };

  const saving = status === "saving";

  return (
    <Enter distance={18}>
      <p className="meta text-vermilion">YouTube</p>
      <h1 className="display-tight mt-2 text-2xl font-bold sm:text-3xl">Home page picks</h1>
      <p className="mt-2 max-w-lg text-[14px] leading-[1.7] text-muted-2">
        Paste a video link or id for the big player and each of the three cards below it.
        Leave the primary one empty to fall back to the channel's most recent upload
        automatically.
      </p>

      {loadState === "loading" && (
        <p className="meta mt-8 text-muted-2">Loading…</p>
      )}

      {loadState === "error" && (
        <p className="meta mt-8 text-vermilion">{loadError}</p>
      )}

      {loadState === "ready" && (
        <form onSubmit={onSubmit} noValidate className="mt-8 max-w-lg space-y-4">
          <div>
            <label htmlFor="yt-primary" className="meta mb-2 block text-muted-2">
              Primary video
            </label>
            <input
              id="yt-primary"
              value={primary}
              onChange={(e) => {
                setPrimary(e.target.value);
                setFormError(null);
                setSaved(false);
              }}
              disabled={saving}
              placeholder="https://youtu.be/… or a bare video id"
              className={FIELD}
            />
          </div>

          {Array.from({ length: SECONDARY_SLOTS }).map((_, i) => (
            <div key={i}>
              <label htmlFor={"yt-sub-" + i} className="meta mb-2 block text-muted-2">
                Sub video {i + 1}
              </label>
              <input
                id={"yt-sub-" + i}
                value={secondary[i]}
                onChange={setSlot(i)}
                disabled={saving}
                placeholder="https://youtu.be/… or a bare video id"
                className={FIELD}
              />
            </div>
          ))}

          {formError && (
            <p
              role="alert"
              className="meta rounded-sm border border-vermilion/30 bg-vermilion/5 px-4 py-3 text-vermilion"
            >
              {formError}
            </p>
          )}

          {saved && !formError && (
            <p
              role="status"
              className="meta rounded-sm border border-line bg-bone px-4 py-3 text-muted-2"
            >
              Saved — the home page picks this up on its next load.
            </p>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className={
                "group flex items-center justify-center gap-3 rounded-sm bg-ink px-6 py-3.5 text-white transition-colors duration-400 " +
                (saving ? "cursor-default opacity-60" : "hover:bg-vermilion")
              }
            >
              <span className="meta">{saving ? "Saving…" : "Save picks"}</span>
              <span className="transition-transform duration-400 group-hover:translate-x-1">→</span>
            </button>

            <button
              type="button"
              onClick={onClear}
              disabled={saving}
              className="meta text-muted-2 transition-colors duration-300 hover:text-ink"
            >
              Clear all
            </button>
          </div>
        </form>
      )}
    </Enter>
  );
}

/* ── Shell ───────────────────────────────────────────────────────────── */

function Dashboard() {
  const { useState } = React;
  const [tab, setTab] = useState("overview");
  const [signingOut, setSigningOut] = useState(false);
  const fullName = document.body.dataset.fullName || "Admin";

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    // Errors here aren't worth surfacing — the cookies are the source of
    // truth and the next /admin/dashboard load re-checks them regardless.
    await Fetcher.post({ endpoint: "/auth/sign-out", showError: false });
    window.location.assign(AFTER_SIGN_OUT);
  };

  return (
    <div className="flex min-h-screen flex-col bg-bone lg:flex-row">
      <Sidebar active={tab} onSelect={setTab} onSignOut={onSignOut} signingOut={signingOut} />

      <main className="flex-1 px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        {tab === "overview" && <OverviewTab fullName={fullName} onSelect={setTab} />}
        {tab === "documentation" && <DocumentationTab />}
        {tab === "writing" && (
          <ComingSoonTab
            label="Writing"
            title="Posts & articles"
            body="Draft, edit and publish the long-form writing that shows up on the site."
          />
        )}
        {tab === "projects" && <ProjectsTab />}
        {tab === "youtube" && <YoutubeTab />}
      </main>
    </div>
  );
}

function App() {
  return (
    <React.Fragment>
      <Cursor />
      <Ripple />
      <Dashboard />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
