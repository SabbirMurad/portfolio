/*
 * Compiles the JSX and the CSS ahead of time, so the browser doesn't have to.
 *
 * Until now every page shipped @babel/standalone (2.8MB) and twenty-odd raw
 * .jsx files, and compiled them on every single visit, and shipped Tailwind's
 * browser build (275KB) to generate the stylesheet alongside them. That is
 * what Google's renderer was being asked to do before it could see a word of
 * the site. This turns each page's script list into one plain .js file, and
 * the whole site's utility classes into one .css file, under assets/build/ —
 * ordinary static files the page links.
 *
 * Nothing is installed into this repo: no package.json, no node_modules.
 * esbuild comes from npx, and Tailwind from a cached install under the user's
 * home (see TOOL_HOME), so both work offline after the first run.
 *
 *   node tools/build_assets.mjs           build once
 *   node tools/build_assets.mjs --watch   rebuild as the sources change
 *
 * tools/bundles.json says which sources go into which page's bundle and in
 * what order. Order matters: these are classic scripts sharing one global
 * scope, so every global has to exist before the file that uses it. Adding a
 * .jsx file to a page means adding it there.
 */

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  watch,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "tools", "bundles.json");
const OUT_DIR = join(ROOT, "assets", "build");
const PARTS_DIR = join(OUT_DIR, ".parts");

/* Tailwind's CLI resolves `@import "tailwindcss"` the way Node resolves a
   package — by walking up looking for node_modules — and an npx cache is not
   somewhere it will look. So instead of npx, the two packages are installed
   once into a directory outside this repo and reused from there; the repo
   itself stays free of node_modules. Delete TOOL_HOME to force a reinstall. */
const TOOL_HOME = join(homedir(), ".cache", "sabbirhassan-build");
const TAILWIND_VERSION = "4.3.3";
const CSS_IN = join(ROOT, "assets", "css", "tailwind.css");
const CSS_OUT = join(OUT_DIR, "tailwind.css");

const ESBUILD = ["--yes", "esbuild@0.24.0"];
const JSX_FLAGS = [
  "--loader:.jsx=jsx",
  "--jsx=transform",
  // Classic runtime: these files expect the React global the UMD build sets,
  // and there is no module system here to import anything from.
  "--jsx-factory=React.createElement",
  "--jsx-fragment=React.Fragment",
  // Whitespace and syntax only. Identifiers stay: every one of these files is
  // a classic script sharing one global scope — helpers.jsx defines Reveal,
  // the sections call it — and renaming a top-level name would break that.
  "--minify-whitespace",
  "--minify-syntax",
  "--charset=utf8",
];

function pagesWithJsx() {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  return Object.entries(manifest).map(([name, sources]) => ({ name, sources }));
}

const abs = (src) => join(ROOT, src.replace(/^\//, ""));
const partFor = (src) => join(PARTS_DIR, src.replace(/^\//, "").replace(/\.jsx$/, ".js"));

/* One esbuild for the whole build, not one per file: the transform itself is
   instant, but spawning npx forty-five times is a minute of process startup —
   long enough that --watch would be useless. */
function compileAll(sources) {
  rmSync(PARTS_DIR, { recursive: true, force: true });

  const missing = sources.filter((s) => !existsSync(abs(s)));
  if (missing.length) throw new Error(`missing sources: ${missing.join(", ")}`);

  // One quoted command string rather than an argv array: node refuses to spawn
  // npx.cmd on Windows without a shell, and passing an array *with* a shell is
  // the combination it warns about. Every argument here is a path this repo
  // owns, so there is nothing to escape beyond the quotes.
  const command = [
    "npx",
    ...ESBUILD,
    ...JSX_FLAGS,
    `"--outbase=${ROOT}"`,
    `"--outdir=${PARTS_DIR}"`,
    ...sources.map((s) => `"${abs(s)}"`),
  ].join(" ");

  execSync(command, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

function tailwindCli() {
  const cli = join(TOOL_HOME, "node_modules", "@tailwindcss", "cli", "dist", "index.mjs");
  if (existsSync(cli)) return cli;

  console.log("installing tailwind into " + TOOL_HOME + " (once) ...");
  mkdirSync(TOOL_HOME, { recursive: true });
  execSync(
    `npm install --no-save --no-audit --no-fund tailwindcss@${TAILWIND_VERSION} @tailwindcss/cli@${TAILWIND_VERSION}`,
    { cwd: TOOL_HOME, stdio: ["ignore", "ignore", "pipe"] },
  );
  return cli;
}

/* The input CSS is compiled from a copy inside TOOL_HOME rather than in place:
   that is the only directory from which `@import "tailwindcss"` resolves. The
   copy's only edit is turning the @source globs absolute, since they were
   written relative to assets/css/ and are about to be read from elsewhere. */
function buildCss() {
  const cli = tailwindCli();
  const staged = join(TOOL_HOME, "input.css");

  const input = readFileSync(CSS_IN, "utf8").replace(
    /@source\s+"(\.[^"]+)"/g,
    (_all, rel) => `@source "${resolve(dirname(CSS_IN), rel).replace(/\\/g, "/")}"`,
  );
  writeFileSync(staged, input);

  execSync(`node "${cli}" -i "${staged}" -o "${CSS_OUT}" --minify`, {
    stdio: ["ignore", "ignore", "pipe"],
  });

  const kb = (readFileSync(CSS_OUT).byteLength / 1024).toFixed(0);
  console.log("tailwind.css".padEnd(24) + "site-wide".padEnd(12) + `${kb} KB`);
}

function build() {
  const started = Date.now();
  const pages = pagesWithJsx();
  const sources = [...new Set(pages.flatMap((p) => p.sources))];

  mkdirSync(OUT_DIR, { recursive: true });
  buildCss();
  compileAll(sources);

  for (const page of pages) {
    const parts = page.sources.map(
      // One comment per file, so a line in the bundle can still be traced back
      // to the .jsx it came from.
      (src) => `/* ${src} */\n${readFileSync(partFor(src), "utf8")}`,
    );

    const bundle =
      `/* Built by tools/build_assets.mjs — do not edit.\n` +
      `   Sources: ${page.sources.join(", ")} */\n` +
      parts.join("\n");

    writeFileSync(join(OUT_DIR, `${page.name}.js`), bundle);
    const kb = (Buffer.byteLength(bundle) / 1024).toFixed(0);
    console.log(
      `${page.name}.js`.padEnd(24) + `${page.sources.length} files`.padEnd(12) + `${kb} KB`,
    );
  }

  rmSync(PARTS_DIR, { recursive: true, force: true });
  console.log(`\n${pages.length} bundles in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return pages;
}

const pages = build();

if (process.argv.includes("--watch")) {
  const dirs = new Set(pages.flatMap((p) => p.sources.map((s) => dirname(abs(s)))));
  // A class name that appears for the first time in a page or in the theme
  // file has to reach the stylesheet too, so those are watched alongside the
  // .jsx. The pages directory is watched recursively for pages/common/*.
  dirs.add(join(ROOT, "pages"));
  dirs.add(dirname(CSS_IN));
  console.log(`\nwatching ${dirs.size} directories — ctrl+c to stop`);

  let pending = null;
  for (const dir of dirs) {
    watch(dir, { persistent: true, recursive: true }, (_event, file) => {
      // global.css sits next to the theme file and is served as-is, so a change
      // to it needs no build.
      if (!file || !/\.(jsx|html)$|(^|[\\/])tailwind\.css$/.test(file)) return;
      clearTimeout(pending);
      pending = setTimeout(() => {
        console.log(`\n${file} changed`);
        try {
          build();
        } catch (err) {
          console.error(String(err.message || err).split("\n").slice(0, 8).join("\n"));
        }
      }, 120);
    });
  }
}
