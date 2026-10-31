// Small formatting helpers shared by server-side rendering and the browser bundle.

export function humanize(name) {
  return String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function englishName(names) {
  const entry = (names ?? []).find((n) => n.language?.name === 'en');
  return entry?.name ?? null;
}

export function collapseWhitespace(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

export function latestEnglishFlavor(entries) {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  if (!en.length) return null;
  return collapseWhitespace(en[en.length - 1].flavor_text);
}

export function idFromUrl(url) {
  const match = /\/(\d+)\/?$/.exec(String(url));
  return match ? Number(match[1]) : null;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

// Escape a JSON string for safe embedding inside a <script> element.
export function escapeJsonForHtml(json) {
  return json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function formatMeters(decimeters) {
  return `${(decimeters / 10).toFixed(1)} m`;
}

export function formatKilograms(hectograms) {
  return `${(hectograms / 10).toFixed(1)} kg`;
}
