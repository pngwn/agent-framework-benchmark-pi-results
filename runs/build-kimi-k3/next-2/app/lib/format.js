// Shared formatting helpers for API data.

// Capitalize each dash-separated word and join with spaces: `mr-mime` -> `Mr Mime`.
export function humanize(name) {
  if (!name) return '';
  return name
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

// The `names` entry whose language is English.
export function englishName(record) {
  const entry = record?.names?.find((n) => n.language?.name === 'en');
  return entry ? entry.name : humanize(record?.name ?? '');
}

// `#0025`
export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function collapseWhitespace(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

// The last English flavor text entry, with whitespace collapsed.
export function latestEnglishFlavorText(record) {
  const entries = (record?.flavor_text_entries ?? []).filter((e) => e.language?.name === 'en');
  const last = entries[entries.length - 1];
  return last ? collapseWhitespace(last.flavor_text) : null;
}

// Numeric id from a resource URL like `/api/v2/pokemon/25/`.
export function idFromUrl(url) {
  const match = /\/(\d+)\/?$/.exec(url ?? '');
  return match ? Number(match[1]) : null;
}

// Alternate forms (ids above 10000) are out of scope.
export function isAlternateFormId(id) {
  return id != null && id > 10000;
}

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export function statLabel(apiName) {
  return STAT_LABELS[apiName] ?? humanize(apiName);
}

export function missing(value) {
  return value == null ? '—' : String(value);
}
