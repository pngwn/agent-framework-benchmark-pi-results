// Shared helpers, safe for both server and browser bundles.

/** mr-mime -> Mr Mime */
export function humanize(name) {
  return String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** English entry from a `names` array, falling back to the humanized API name. */
export function englishName(names, fallback) {
  const entry = names?.find((n) => n.language?.name === 'en');
  return entry?.name ?? humanize(fallback);
}

/** Latest English flavor text with all whitespace runs collapsed. */
export function latestEnFlavor(entries) {
  if (!Array.isArray(entries)) return null;
  const en = entries.filter((e) => e.language?.name === 'en');
  if (!en.length) return null;
  return en[en.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
}

/** # plus four zero-padded digits. */
export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

/** Numeric id from an API resource URL. */
export function idFromUrl(url) {
  return Number(String(url).match(/\/(\d+)\/?$/)[1]);
}
