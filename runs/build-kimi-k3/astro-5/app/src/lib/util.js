/** "mr-mime" -> "Mr Mime" */
export const humanize = (name = '') =>
  String(name)
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

/** 25 -> "#0025" */
export const dexNumber = (id) => `#${String(id).padStart(4, '0')}`;

/** English entry of a `names` array, with a sensible fallback. */
export const englishName = (record, fallback) =>
  record?.names?.find((n) => n.language?.name === 'en')?.name ?? fallback ?? humanize(record?.name ?? '');

/** Last English flavor text entry, whitespace collapsed. */
export function latestEnglishFlavor(entries) {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  const last = en[en.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

/** Numeric id from a resource URL like ".../pokemon-species/25/". */
export const idFromUrl = (url) => Number(String(url).match(/\/(\d+)\/?$/)?.[1]);

/** Display a possibly-missing scalar; missing values show as an em dash. */
export const missing = (v) => (v === null || v === undefined ? '—' : String(v));

/** Collapse all whitespace runs to single spaces. */
export const collapse = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

export const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
