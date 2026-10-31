// Small shared helpers.

export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

// API name -> display name: "thunder-punch" -> "Thunder Punch".
export function humanize(name) {
  return String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

// Dex number: 25 -> "#0025".
export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

// ".../pokemon/25/" -> 25
export function idFromUrl(url) {
  const match = /\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : null;
}

// English entry from a `names` array.
export function englishName(names) {
  return names?.find((n) => n.language?.name === 'en')?.name ?? null;
}

export function collapseWhitespace(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

// Latest English flavor text from a flavor_text_entries array.
export function latestEnglishFlavor(entries) {
  const english = (entries ?? []).filter((e) => e.language?.name === 'en');
  const last = english[english.length - 1];
  return last ? collapseWhitespace(last.flavor_text) : null;
}

export const MISSING = '—';

export function showValue(value) {
  return value === null || value === undefined ? MISSING : String(value);
}
