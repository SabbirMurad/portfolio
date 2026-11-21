# sabbirhassan.com

The portfolio, CV and admin dashboard behind [sabbirhassan.com](https://sabbirhassan.com).

**The server is Rust.** An [Actix Web](https://actix.rs/) app renders the pages with
[Tera](https://keats.github.io/tera/) templates and serves a JSON API for the dynamic parts:
projects, documentation, the YouTube and LeetCode sections, contact messages, and a
signed-in admin dashboard for managing all of it. The front end is React components
compiled ahead of time to plain scripts. There is no Node runtime in production.

- **Server:** Rust, Actix Web, Tokio, Tera
- **Data:** MongoDB (content), Redis (sessions, caches), SQLite (image blobs, served as WebP)
- **Front end:** React 18, GSAP, Tailwind CSS v4, built by `tools/build_assets.mjs` (esbuild)
- **Notable bits:** server-rendered CV with two swappable résumés (`/resume`, `/resume_hidden`),
  a JSON-LD/Open Graph SEO head shared by every page, blurhash image placeholders, and a
  small CLI (`assets/cli/`) that authenticates against the API

## Run it

```bash
# assets: .jsx -> assets/build/*.js, and the Tailwind build
node tools/build_assets.mjs --watch

# server, restarted on change (socket kept open by systemfd)
systemfd --no-pid -s http::8080 -- \
  cargo watch -i ".cargo/*" -i "target/*" -i ".git/*" -i "static/*" -i "logs/*" \
              -i "assets/build/*" -x run
```

`run.bat` runs both. MongoDB and Redis are expected on localhost (see `.env.dev`).
For the full documentation:

```bash
mkdocs serve
```
