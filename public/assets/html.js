// A tiny auto-escaping template tag. Every interpolated value is HTML-escaped
// unless it's already a Safe fragment (the result of another html`` call), so
// model-written text can never inject markup. Used by the server (pages) and
// the browser (live re-renders) alike.

export class Safe {
  constructor(s) {
    this.s = s;
  }
  toString() {
    return this.s;
  }
}

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(v) {
  if (v == null || v === false) return '';
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(esc).join('');
  return String(v).replace(/[&<>"']/g, (c) => ENT[c]);
}

export const html = (strings, ...vals) =>
  new Safe(strings.reduce((out, s, i) => out + s + (i < vals.length ? esc(vals[i]) : ''), ''));

// Only for markup we wrote ourselves (e.g. JSON-LD after JSON.stringify).
export const raw = (s) => new Safe(String(s));

// http(s) links only; anything else renders as no link.
export function safeUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
