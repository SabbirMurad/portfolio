/*
 * BlurHash — decoder only.
 *
 * The encoder lives in assets/js/image-uploader.js and runs at upload time;
 * this is the other half, used on the public pages to paint a thumbnail's
 * blurhash while the real file is still coming down the wire.
 *
 * Port of woltapp/blurhash's decode.ts. The two halves have to agree on the
 * base83 alphabet and the sRGB<->linear curve, so those are duplicated
 * verbatim rather than shared — image-uploader.js is dashboard-only and this
 * is loaded on every public page; neither should have to pull in the other.
 *
 * Output is a data: URL rather than an ImageData, because that is what a CSS
 * background-image wants. Decoding is done at DECODE_W x DECODE_H — a blurhash
 * holds 4x3 frequency components and carries no detail beyond that, so
 * decoding larger only costs time. The browser's own smoothing does the
 * upscale, which is exactly the blur we want.
 */
class BlurHash {
  static #BASE83 =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

  // Small on purpose — see the note above. 32x32 covers any aspect ratio
  // we render, since the result is stretched to the box either way.
  static #DECODE_W = 32;
  static #DECODE_H = 32;

  // Decoding is pure, and the same handful of hashes are rendered over and
  // over (a grid re-rendering on filter, a card remounting). Keyed by hash.
  static #cache = new Map();
  static #CACHE_MAX = 64;

  /* ── public ────────────────────────────────────────────────────────── */

  /** Cheap structural check — does this string parse as a blurhash at all? */
  static valid(hash) {
    if (typeof hash !== "string" || hash.length < 6) return false;
    const sizeFlag = BlurHash.#decode83(hash[0]);
    if (sizeFlag < 0) return false;
    const numY = Math.floor(sizeFlag / 9) + 1;
    const numX = (sizeFlag % 9) + 1;
    return hash.length === 4 + 2 * numX * numY;
  }

  /**
   * A data: URL of the decoded hash, ready for `background-image`.
   * Returns null for anything that doesn't parse, so callers can fall back
   * without a try/catch.
   */
  static toDataURL(hash, punch) {
    if (!BlurHash.valid(hash)) return null;

    const key = hash + "|" + (punch || 1);
    if (BlurHash.#cache.has(key)) return BlurHash.#cache.get(key);

    let url = null;
    try {
      url = BlurHash.#render(hash, punch || 1);
    } catch (_) {
      url = null;
    }

    // A plain FIFO trim; this never grows past a page's worth of cards.
    if (BlurHash.#cache.size >= BlurHash.#CACHE_MAX) {
      BlurHash.#cache.delete(BlurHash.#cache.keys().next().value);
    }
    BlurHash.#cache.set(key, url);
    return url;
  }

  /**
   * The average colour of a hash, as `rgb(...)` — the DC term alone.
   * Note this is a linear-light average converted back to sRGB, so it sits
   * brighter than the sRGB-space mean of the same picture. That is blurhash's
   * definition, not a rounding slip.
   */
  static averageColor(hash) {
    if (!BlurHash.valid(hash)) return null;
    const linear = BlurHash.#decodeDC(BlurHash.#decode83(hash.substring(2, 6)));
    const [r, g, b] = linear.map(BlurHash.#linearTosRGB);
    return "rgb(" + r + ", " + g + ", " + b + ")";
  }

  /* ── internals ─────────────────────────────────────────────────────── */

  static #decode83(str) {
    let value = 0;
    for (let i = 0; i < str.length; i++) {
      const digit = BlurHash.#BASE83.indexOf(str[i]);
      if (digit === -1) return -1;
      value = value * 83 + digit;
    }
    return value;
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

  static #signPow(value, exp) {
    return Math.sign(value) * Math.pow(Math.abs(value), exp);
  }

  static #decodeDC(value) {
    return [
      BlurHash.#sRGBToLinear(value >> 16),
      BlurHash.#sRGBToLinear((value >> 8) & 255),
      BlurHash.#sRGBToLinear(value & 255),
    ];
  }

  static #decodeAC(value, maximumValue) {
    const quantR = Math.floor(value / (19 * 19));
    const quantG = Math.floor(value / 19) % 19;
    const quantB = value % 19;
    return [
      BlurHash.#signPow((quantR - 9) / 9, 2) * maximumValue,
      BlurHash.#signPow((quantG - 9) / 9, 2) * maximumValue,
      BlurHash.#signPow((quantB - 9) / 9, 2) * maximumValue,
    ];
  }

  static #render(hash, punch) {
    const sizeFlag = BlurHash.#decode83(hash[0]);
    const numY = Math.floor(sizeFlag / 9) + 1;
    const numX = (sizeFlag % 9) + 1;

    const maximumValue = (BlurHash.#decode83(hash[1]) + 1) / 166;

    const colors = new Array(numX * numY);
    // The DC term is stored unquantised; every AC term after it is a pair of
    // base83 digits scaled against `maximumValue`.
    colors[0] = BlurHash.#decodeDC(BlurHash.#decode83(hash.substring(2, 6)));
    for (let i = 1; i < colors.length; i++) {
      const value = BlurHash.#decode83(hash.substring(4 + i * 2, 6 + i * 2));
      colors[i] = BlurHash.#decodeAC(value, maximumValue * punch);
    }

    const width = BlurHash.#DECODE_W;
    const height = BlurHash.#DECODE_H;
    const pixels = new Uint8ClampedArray(width * height * 4);

    // Cosine basis, separable: cache the x terms per row rather than calling
    // Math.cos width*height*numX*numY times.
    const cosX = new Float64Array(width * numX);
    for (let x = 0; x < width; x++) {
      for (let i = 0; i < numX; i++) {
        cosX[x * numX + i] = Math.cos((Math.PI * x * i) / width);
      }
    }

    for (let y = 0; y < height; y++) {
      const cosY = new Float64Array(numY);
      for (let j = 0; j < numY; j++) cosY[j] = Math.cos((Math.PI * y * j) / height);

      for (let x = 0; x < width; x++) {
        let r = 0;
        let g = 0;
        let b = 0;

        for (let j = 0; j < numY; j++) {
          for (let i = 0; i < numX; i++) {
            const basis = cosX[x * numX + i] * cosY[j];
            const color = colors[i + j * numX];
            r += color[0] * basis;
            g += color[1] * basis;
            b += color[2] * basis;
          }
        }

        const p = 4 * (x + y * width);
        pixels[p] = BlurHash.#linearTosRGB(r);
        pixels[p + 1] = BlurHash.#linearTosRGB(g);
        pixels[p + 2] = BlurHash.#linearTosRGB(b);
        pixels[p + 3] = 255;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
    return canvas.toDataURL();
  }
}

window.BlurHash = BlurHash;
