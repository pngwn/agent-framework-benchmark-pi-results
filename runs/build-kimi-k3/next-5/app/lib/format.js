// Shared formatting helpers (safe to use on server and client).

/** Humanize an API name: each `-`-separated word capitalized, joined by spaces. */
export function humanize(name) {
  return String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** Dex number: `#` plus four zero-padded digits. */
export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

/** English name from a `names` list, if present. */
export function englishName(names) {
  return names?.find((n) => n.language?.name === 'en')?.name;
}

/** Numeric id parsed from a PokeAPI resource URL (absolute or relative). */
export function idFromUrl(url) {
  const match = /\/(\d+)\/?$/.exec(String(url));
  return match ? Number(match[1]) : null;
}

/** Collapse every run of whitespace (including \n and \f) to a single space. */
export function collapseWhitespace(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

/** Latest English flavor text from a `flavor_text_entries` list. */
export function latestEnglishFlavorText(entries) {
  const english = (entries ?? []).filter((e) => e.language?.name === 'en');
  const last = english[english.length - 1];
  return last ? collapseWhitespace(last.flavor_text) : null;
}

/** English short effect from an `effect_entries` list. */
export function englishShortEffect(entries) {
  const entry = (entries ?? []).find((e) => e.language?.name === 'en');
  return entry ? collapseWhitespace(entry.short_effect) : null;
}
