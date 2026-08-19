/*
 * Image uploads for the dashboard — the client half of
 * src/handler/image/upload.rs.
 *
 * That handler follows fanari_backend's shape: one request can carry several
 * images, each file part paired with text parts carrying its metadata, matched
 * by a trailing index.
 *
 *   image_0      (file)  the bytes
 *   width_0      (text)  natural width
 *   height_0     (text)  natural height
 *   blur_hash_0  (text)  BlurHash string
 *   used_at_0    (text)  an AssetUsedAt variant name
 *   temporary_0  (text)  "true" | "false"
 *   uuid_0       (text)  optional; the server generates one when absent
 *
 * Producing those is this file's job. The browser has already decoded the
 * image to preview it, so width/height are free, and the blurhash is computed
 * from that same decode — there is no blurhash crate on the server side.
 *
 * The handler still reads original_type, original_size and webp_size off the
 * bytes, so what is sent here describes the image rather than gating it.
 *
 * Load after assets/js/fetcher.js — a 401 mid-upload is refreshed through
 * Fetcher.refreshSession() so both share one in-flight refresh.
 */
class ImageUploader {
    /** Field name prefixes. Must match src/handler/image/upload.rs. */
    static FIELD = "image";

    /** Mirrors MAX_FILE_BYTES in the handler. */
    static MAX_BYTES = 8 * 1024 * 1024;

    /** Mirrors MAX_IMAGES / MAX_TOTAL_BYTES in the handler. */
    static MAX_FILES = 8;
    static MAX_TOTAL_BYTES = 32 * 1024 * 1024;

    /** Mirrors AllowedImageType in src/model.rs. The server sniffs magic bytes
     *  rather than trusting the type the browser reports, so this is a
     *  convenience check, not the real gate. */
    static TYPES = ["image/gif", "image/png", "image/jpeg", "image/webp"];

    /** For an <input type="file"> accept attribute. */
    static ACCEPT = "image/gif,image/png,image/jpeg,image/webp";

    /** AssetUsedAt variants (src/model.rs) — `used_at_<n>` must be one of these
     *  spelled exactly; from_str() falls back to ProfilePic on anything else. */
    static USED_AT = {
        ProfilePic: "ProfilePic",
        CoverPic: "CoverPic",
        Post: "Post",
        Comment: "Comment",
        Chat: "Chat",
        VideoThumbnail: "VideoThumbnail",
        ProjectThumbnail: "ProjectThumbnail",
    };

    /** Refuse absurd pixel counts before decoding them. The server has no
     *  equivalent cap (it decodes to RGBA in convert_to_webp), so treat this as
     *  a UX guard, not a security one. */
    static MAX_PIXELS = 50_000_000;

    /** BlurHash component counts. 4x3 is the usual choice for a wide thumbnail
     *  — more components means a longer string for detail nobody sees at
     *  blur-placeholder size. */
    static BLUR_COMPONENTS = { x: 4, y: 3 };

    /* ── URLs the API serves images back on (src/routes/image.rs) ── */

    /** Converted WebP — what the UI should render. */
    static webpUrl(imageId) {
        return "/image/webp/" + encodeURIComponent(imageId);
    }

    /** The bytes exactly as uploaded. */
    static originalUrl(imageId) {
        return "/image/original/" + encodeURIComponent(imageId);
    }

    /**
     * Synchronous pre-flight against the server's own rules.
     * @param {File} file
     * @returns {{ok: boolean, error: (string|null)}}
     */
    static check(file) {
        if (!file) {
            return { ok: false, error: "No file selected" };
        }
        // Some browsers report an empty type for exotic files; fall back to
        // the extension rather than rejecting something the server would take.
        const type = file.type || ImageUploader.#typeFromName(file.name);
        if (!ImageUploader.TYPES.includes(type)) {
            return { ok: false, error: "Use a PNG, JPEG, WebP or GIF" };
        }
        if (file.size === 0) {
            return { ok: false, error: "That file is empty" };
        }
        if (file.size > ImageUploader.MAX_BYTES) {
            const mb = Math.floor(ImageUploader.MAX_BYTES / (1024 * 1024));
            return { ok: false, error: `Image is too large (max ${mb}MB)` };
        }
        return { ok: true, error: null };
    }

    /**
     * Everything the handler wants about one file, from a single decode:
     * dimensions, a BlurHash, and a preview URL.
     *
     * The caller owns `previewUrl` and must pass it to `revoke()` when the
     * preview goes away, or the blob leaks for the life of the document.
     *
     * @param {File} file
     * @returns {Promise<{ok: boolean, width: number, height: number, blurHash: (string|null), previewUrl: (string|null), error: (string|null)}>}
     */
    static async probe(file) {
        const fail = (error) => ({
            ok: false,
            width: 0,
            height: 0,
            blurHash: null,
            previewUrl: null,
            error,
        });

        const previewUrl = URL.createObjectURL(file);
        let img;
        try {
            img = await ImageUploader.#decode(previewUrl);
        } catch (e) {
            URL.revokeObjectURL(previewUrl);
            return fail("That file isn't a readable image");
        }

        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (!width || !height) {
            URL.revokeObjectURL(previewUrl);
            return fail("Could not read the image dimensions");
        }
        if (width * height > ImageUploader.MAX_PIXELS) {
            URL.revokeObjectURL(previewUrl);
            return fail("Image resolution is too large");
        }

        let blurHash;
        try {
            blurHash = ImageUploader.blurHash(img, width, height);
        } catch (e) {
            // A tainted or oversized canvas shouldn't sink the upload; the
            // field is required, so send the empty string rather than nothing.
            console.error(e);
            blurHash = "";
        }

        return { ok: true, width, height, blurHash, previewUrl, error: null };
    }

    /** Release a `previewUrl` handed back by `probe()`. Safe to call twice. */
    static revoke(previewUrl) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }

    /**
     * POST one or more files to /api/image/upload.
     *
     * @param {File} [options.file] - Single-file shorthand for `files: [file]`.
     * @param {File[]} [options.files]
     * @param {string} [options.usedAt] - An AssetUsedAt variant; defaults to
     *        ProjectThumbnail. A string, or an array parallel to `files`.
     * @param {boolean} [options.temporary] - Defaults to false.
     * @param {Object|Object[]} [options.meta] - `{width, height, blurHash}` a
     *        caller already has from `probe()` (to render a preview, say).
     *        Passing it skips a second decode of the same file.
     * @param {function(number):void} [options.onProgress] - 0..1, or -1 while
     *        the length is unknown.
     * @param {AbortSignal} [options.signal]
     * @param {boolean} [options.check] - Run `check()` first (default true).
     * @returns {Promise<{ok: boolean, status: number, images: Object[], image: (Object|null), error: (string|null)}>}
     *          On success each entry is the handler's ImageStruct:
     *          { uuid, width, height, original_size, webp_size, blur_hash,
     *            used_at, original_type, temporary, deleted, created_at }
     */
    static async upload(options) {
        const {
            file,
            files,
            usedAt = ImageUploader.USED_AT.ProjectThumbnail,
            temporary = false,
            meta,
            onProgress,
            signal,
            check = true,
            _retried = false,
            _body = null,
        } = options || {};

        const fail = (error, status = 0) => ({ ok: false, status, images: [], image: null, error });

        // The retry after a 401 reuses the body it already built — re-probing
        // would mean decoding and re-hashing every file a second time.
        let body = _body;

        if (!body) {
            const list = files && files.length ? files : file ? [file] : [];
            if (!list.length) return fail("No file selected");
            if (list.length > ImageUploader.MAX_FILES) {
                return fail(`Too many images (max ${ImageUploader.MAX_FILES})`);
            }

            const total = list.reduce((sum, f) => sum + f.size, 0);
            if (total > ImageUploader.MAX_TOTAL_BYTES) {
                return fail("Upload is too large");
            }

            body = new FormData();

            for (let i = 0; i < list.length; i++) {
                const item = list[i];

                if (check) {
                    const pre = ImageUploader.check(item);
                    if (!pre.ok) return fail(pre.error);
                }

                const given = Array.isArray(meta) ? meta[i] : list.length === 1 ? meta : null;
                let probed;
                if (given && given.width && given.height) {
                    probed = { ok: true, width: given.width, height: given.height, blurHash: given.blurHash, previewUrl: null };
                } else {
                    probed = await ImageUploader.probe(item);
                    if (!probed.ok) return fail(probed.error);
                    // Nothing renders this preview — it exists only because the
                    // decode produced it.
                    ImageUploader.revoke(probed.previewUrl);
                }

                const used = Array.isArray(usedAt) ? usedAt[i] : usedAt;

                body.append(`${ImageUploader.FIELD}_${i}`, item, item.name);
                body.append(`width_${i}`, String(probed.width));
                body.append(`height_${i}`, String(probed.height));
                body.append(`blur_hash_${i}`, probed.blurHash || "");
                body.append(`used_at_${i}`, used || ImageUploader.USED_AT.ProjectThumbnail);
                body.append(`temporary_${i}`, temporary ? "true" : "false");
            }
        }

        const result = await ImageUploader.#send(body, onProgress, signal);

        // The access-token cookie is short-lived (15 minutes); a long upload can
        // start inside it and land outside. Refresh once and resend.
        if (result.status === 401 && !_retried && typeof Fetcher !== "undefined") {
            const refreshed = await Fetcher.refreshSession();
            if (refreshed) {
                return ImageUploader.upload({
                    ...options,
                    _retried: true,
                    _body: body,
                });
            }
        }

        return result;
    }

    /**
     * Metadata for images already uploaded (src/handler/image/metadata*.rs).
     * @param {string|string[]} ids
     * @returns {Promise<{ok: boolean, images: Object[], error: (string|null)}>}
     */
    static async metadata(ids) {
        const many = Array.isArray(ids);
        const result = many
            ? await Fetcher.post({ endpoint: "/image/metadata", body: ids, showError: false })
            : await Fetcher.get({ endpoint: "/image/metadata/" + ids, showError: false });

        if (!result.ok) {
            return { ok: false, images: [], error: result.error };
        }
        return {
            ok: true,
            images: many ? result.data || [] : [result.data],
            error: null,
        };
    }

    /* ── BlurHash ──
     * Encoder per the reference implementation (github.com/woltapp/blurhash).
     * The cost is componentsX * componentsY * pixels, so the image is drawn
     * into a small canvas first — the output is a handful of DCT coefficients
     * and downscaling first changes them barely at all.
     */

    static #BASE83 =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

    /** Longest edge of the canvas the hash is computed from. */
    static #BLUR_SAMPLE = 32;

    /**
     * @param {CanvasImageSource} source - anything drawImage accepts.
     * @param {number} width - source width
     * @param {number} height - source height
     * @returns {string} the BlurHash
     */
    static blurHash(source, width, height) {
        const cx = ImageUploader.BLUR_COMPONENTS.x;
        const cy = ImageUploader.BLUR_COMPONENTS.y;

        const scale = Math.min(1, ImageUploader.#BLUR_SAMPLE / Math.max(width, height));
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(source, 0, 0, w, h);
        const pixels = ctx.getImageData(0, 0, w, h).data;

        const factors = [];
        for (let y = 0; y < cy; y++) {
            for (let x = 0; x < cx; x++) {
                const normalisation = x === 0 && y === 0 ? 1 : 2;
                let r = 0;
                let g = 0;
                let b = 0;

                for (let j = 0; j < h; j++) {
                    for (let i = 0; i < w; i++) {
                        const basis =
                            normalisation *
                            Math.cos((Math.PI * x * i) / w) *
                            Math.cos((Math.PI * y * j) / h);
                        const p = 4 * i + j * 4 * w;
                        r += basis * ImageUploader.#sRGBToLinear(pixels[p]);
                        g += basis * ImageUploader.#sRGBToLinear(pixels[p + 1]);
                        b += basis * ImageUploader.#sRGBToLinear(pixels[p + 2]);
                    }
                }

                const s = 1 / (w * h);
                factors.push([r * s, g * s, b * s]);
            }
        }

        const dc = factors[0];
        const ac = factors.slice(1);

        let hash = "";
        hash += ImageUploader.#encode83((cx - 1) + (cy - 1) * 9, 1);

        let maximumValue;
        if (ac.length > 0) {
            const actualMax = Math.max(...ac.map((f) => Math.max(...f.map(Math.abs))));
            const quantisedMax = Math.max(0, Math.min(82, Math.floor(actualMax * 166 - 0.5)));
            maximumValue = (quantisedMax + 1) / 166;
            hash += ImageUploader.#encode83(quantisedMax, 1);
        } else {
            maximumValue = 1;
            hash += ImageUploader.#encode83(0, 1);
        }

        hash += ImageUploader.#encode83(ImageUploader.#encodeDC(dc), 4);
        for (const factor of ac) {
            hash += ImageUploader.#encode83(ImageUploader.#encodeAC(factor, maximumValue), 2);
        }

        return hash;
    }

    static #encode83(value, length) {
        let result = "";
        for (let i = 1; i <= length; i++) {
            const digit = Math.floor(value / Math.pow(83, length - i)) % 83;
            result += ImageUploader.#BASE83[digit];
        }
        return result;
    }

    static #sRGBToLinear(value) {
        const v = value / 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }

    static #linearTosRGB(value) {
        const v = Math.max(0, Math.min(1, value));
        return v <= 0.0031308
            ? Math.round(v * 12.92 * 255 + 0.5)
            : Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255 + 0.5);
    }

    static #encodeDC([r, g, b]) {
        return (
            (ImageUploader.#linearTosRGB(r) << 16) +
            (ImageUploader.#linearTosRGB(g) << 8) +
            ImageUploader.#linearTosRGB(b)
        );
    }

    static #encodeAC([r, g, b], maximumValue) {
        const quant = (c) =>
            Math.max(
                0,
                Math.min(18, Math.floor(ImageUploader.#signPow(c / maximumValue, 0.5) * 9 + 9.5))
            );
        return quant(r) * 19 * 19 + quant(g) * 19 + quant(b);
    }

    static #signPow(value, exp) {
        return Math.sign(value) * Math.pow(Math.abs(value), exp);
    }

    /* ── internals ── */

    static #decode(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("decode failed"));
            img.src = url;
        });
    }

    /**
     * XHR rather than fetch: fetch has no upload-progress event, and progress
     * is the whole reason this doesn't just call Fetcher.upload(). Everything
     * else here mirrors what Fetcher does — same /api prefix, same-origin
     * credentials, same `message`-then-`error` reading of the failure body
     * (src/utils/response.rs sends `{ message }`).
     */
    static #send(body, onProgress, signal) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            const url = (window.projectDomain || "") + "/api/image/upload";

            xhr.open("POST", url, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader("Accept", "application/json");
            // No Content-Type: the browser has to set the multipart boundary.

            if (typeof onProgress === "function") {
                xhr.upload.onprogress = (e) => {
                    onProgress(e.lengthComputable ? e.loaded / e.total : -1);
                };
            }

            const onAbort = () => xhr.abort();
            const done = (out) => {
                if (signal) signal.removeEventListener("abort", onAbort);
                resolve(out);
            };

            if (signal) {
                if (signal.aborted) {
                    resolve({ ok: false, status: 0, images: [], image: null, error: "Upload cancelled" });
                    return;
                }
                signal.addEventListener("abort", onAbort);
            }

            const failed = (status, error) => done({ ok: false, status, images: [], image: null, error });

            xhr.onabort = () => failed(0, "Upload cancelled");
            xhr.onerror = () => failed(0, "Could not reach the server");
            xhr.ontimeout = () => failed(0, "Upload timed out");

            xhr.onload = () => {
                let payload = null;
                try {
                    payload = JSON.parse(xhr.responseText);
                } catch (e) {
                    payload = null;
                }

                if (xhr.status >= 200 && xhr.status < 300) {
                    const images = Array.isArray(payload) ? payload : payload ? [payload] : [];
                    done({
                        ok: true,
                        status: xhr.status,
                        images,
                        image: images[0] || null,
                        error: null,
                    });
                    return;
                }

                failed(
                    xhr.status,
                    (payload && (payload.message || payload.error)) ||
                        `Upload failed (${xhr.status})`
                );
            };

            xhr.send(body);
        });
    }

    /** Last-resort type guess when the browser reports none. */
    static #typeFromName(name) {
        const ext = String(name || "").toLowerCase().split(".").pop();
        switch (ext) {
            case "png":
                return "image/png";
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "webp":
                return "image/webp";
            case "gif":
                return "image/gif";
            default:
                return "";
        }
    }
}

window.ImageUploader = ImageUploader;
