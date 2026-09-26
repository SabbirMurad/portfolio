# Issue: App generates redirects with hardcoded internal port instead of public domain

## Context

This VPS runs nginx as a reverse proxy in front of two backend apps:

| Domain | nginx listens on | Proxies to (app's real bind address) |
|---|---|---|
| `sabbirhassan.com` (+ `www`) | 80 (soon 443) | `https://127.0.0.1:444` (app: `portfolio`) |
| `scaffold.sabbirhassan.com` | 80 (soon 443) | `https://127.0.0.1:445` (app: `scaffold`) |

Both backend apps serve **HTTPS directly** on their own port (444 / 445) — confirmed via:
```bash
curl -vk https://127.0.0.1:444/   # returns valid HTML from the portfolio app
```

Both ports are also exposed through the firewall, so visiting `https://sabbirhassan.com:444` directly in a browser works fine (bypassing nginx entirely).

## The bug

When nginx proxies a request for `sabbirhassan.com` (port 80) to the app on `127.0.0.1:444`, the app responds with a redirect like:

```
HTTP/1.1 301 Moved Permanently
location: https://sabbirhassan.com:444/
```

i.e. the app redirects to **its own bind address including the `:444` port**, instead of the clean public domain (`https://sabbirhassan.com/`, no port). Since port 444 isn't meant to be the public-facing address, this breaks the reverse-proxy setup — visitors get redirected to a URL that shouldn't be the canonical one.

This is confirmed to be an **app-level issue, not an nginx issue** — nginx is just faithfully passing through whatever `Location` header the app sends. Verified with:

```bash
curl -v -H "Host: sabbirhassan.com" http://127.0.0.1:80/
# ...
# < location: https://sabbirhassan.com:444/
```

## Root cause

The `portfolio` app (and likely `scaffold` too — needs checking) has some kind of "base URL" / "public URL" / "canonical host" setting used to build absolute redirect URLs (e.g. enforcing HTTPS, enforcing trailing slash, canonical hostname, etc.). This setting is currently either:
- Explicitly configured as `sabbirhassan.com:444`, or
- Auto-derived from the app's own bind address/port (`0.0.0.0:444`) with no awareness that it sits behind a reverse proxy.

The app has no built-in awareness that nginx is in front of it rewriting the effective public URL to something without the port.

Response headers from the app include `x-signature: bitlaab` — if this is a custom framework/toolkit called "Bitlaab," check its docs/source for this behavior.

## What needs to happen

1. **Find where the app builds/configures the canonical base URL.** Search the `portfolio` app's config/env for something like: `BASE_URL`, `PUBLIC_URL`, `APP_URL`, `HOST`, `SERVER_NAME`, `CANONICAL_HOST`, `ORIGIN`, or similar. Do the same for the `scaffold` app.
2. **Change that value to the clean public domain, no port:**
   - `portfolio` → `https://sabbirhassan.com`
   - `scaffold` → `https://scaffold.sabbirhassan.com`
3. If the framework supports a "trust proxy" / "behind reverse proxy" mode (common in Express, Django, Rails, etc.) that derives the canonical host from `X-Forwarded-Host` / `X-Forwarded-Proto` headers instead of its own bind address, prefer enabling that — nginx is already configured to send these headers:
   ```nginx
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```
4. After the fix, any redirect issued by the apps should show the clean domain (no `:444`/`:445`) in the `Location` header. Verify with:
   ```bash
   curl -v -H "Host: sabbirhassan.com" http://127.0.0.1:80/
   curl -v -H "Host: scaffold.sabbirhassan.com" http://127.0.0.1:80/
   ```
   Expect `location: https://sabbirhassan.com/` and `location: https://scaffold.sabbirhassan.com/` respectively — no port in either.

## Current temporary workaround (already applied, can stay as a safety net or be removed once the app-level fix is in)

In the nginx config for `sabbirhassan.com`, a `proxy_redirect` directive rewrites the bad `Location` header on the way out:

```nginx
location / {
    proxy_pass https://127.0.0.1:444;
    proxy_redirect https://sabbirhassan.com:444/ https://sabbirhassan.com/;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

The equivalent needs to be added/verified for `scaffold.sabbirhassan.com` → port 445 (confirm the exact redirect host the scaffold app returns first with `curl -vk https://127.0.0.1:445/`, since it may differ).

This is a band-aid, not a fix — once the app's own base-URL config is corrected, this `proxy_redirect` becomes unnecessary (but is harmless to leave in place as a fallback).

## Goal / definition of done

- `https://sabbirhassan.com` loads the portfolio app correctly, staying on the clean domain with no port anywhere in the URL bar, even after any internal redirects.
- `https://scaffold.sabbirhassan.com` loads the scaffold app the same way.
- Ideally, the fix is at the app config level (not just the nginx band-aid), so any other absolute URLs the app generates (cookies, CORS, OAuth callbacks, internal links, etc.) are also correct.
