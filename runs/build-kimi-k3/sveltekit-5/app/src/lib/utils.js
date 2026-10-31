/** Humanize an API name: each `-`-separated word capitalized, joined by spaces. */
export function humanize(name) {
  return String(name ?? '')
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** English entry of a `names` list, with a fallback. */
export function englishName(names, fallback = null) {
  const en = (names ?? []).find((n) => n.language?.name === 'en');
  return en?.name ?? fallback;
}

/** Dex number: `#` plus four zero-padded digits. */
export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

/** Collapse every run of whitespace (including \n and \f) to a single space. */
export function collapseWhitespace(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/** Latest English flavor text of a resource, whitespace-collapsed. */
export function latestEnglishFlavor(entries) {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  if (!en.length) return null;
  return collapseWhitespace(en[en.length - 1].flavor_text);
}

/** English short effect from `effect_entries`, whitespace-collapsed. */
export function englishShortEffect(entries) {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  if (!en.length) return null;
  return collapseWhitespace(en[en.length - 1].short_effect);
}

/** Numeric id at the end of an API URL (`/api/v2/pokemon/25/` -> 25). */
export function urlId(url) {
  const match = /\/(\d+)\/?$/.exec(String(url ?? ''));
  return match ? Number(match[1]) : null;
}

/** Path of an API URL relative to `/api/v2/` (`pokemon/25/`). */
export function apiPath(url) {
  const match = /\/api\/v2\/(.+)$/.exec(String(url ?? ''));
  return match ? match[1] : null;
}

export const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed'
};
