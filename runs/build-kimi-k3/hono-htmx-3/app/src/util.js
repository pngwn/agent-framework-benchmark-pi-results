// Humanize an API name: capitalize each dash-separated word and join with spaces.
export const humanize = (name) =>
  String(name)
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

// Dex number: # plus four zero-padded digits.
export const dexNo = (id) => `#${String(id).padStart(4, '0')}`;

export const enName = (names) => (names ?? []).find((n) => n.language.name === 'en')?.name ?? null;

// Latest English flavor text with whitespace runs collapsed to single spaces.
export function lastEnFlavor(entries) {
  const en = (entries ?? []).filter((e) => e.language.name === 'en');
  if (!en.length) return null;
  return en[en.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
}

export const MISSING = '—';
export const showNum = (v) => (v === null || v === undefined ? MISSING : String(v));
