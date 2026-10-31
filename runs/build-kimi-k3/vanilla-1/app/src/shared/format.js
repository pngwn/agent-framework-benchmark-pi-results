// Shared helpers, usable in both the Node server and the browser bundle.

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

// "mr-mime" -> "Mr Mime", "thunder-punch" -> "Thunder Punch"
export function humanize(name) {
  return String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

// 25 -> "#0025"
export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

// ".../pokemon-species/25/" -> 25
export function idFromUrl(url) {
  const match = String(url).match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

// English name from a `names` array, falling back to the humanized API name.
export function englishName(resource, fallbackApiName) {
  const entry = resource.names?.find((n) => n.language?.name === 'en');
  return entry ? entry.name : humanize(fallbackApiName ?? resource.name);
}

export function collapseWhitespace(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

// Last English flavor text with whitespace collapsed, or null.
export function latestEnglishFlavor(entries) {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  if (!en.length) return null;
  return collapseWhitespace(en[en.length - 1].flavor_text);
}

export const EM_DASH = '—';
export const showValue = (value) => (value === null || value === undefined ? EM_DASH : String(value));
