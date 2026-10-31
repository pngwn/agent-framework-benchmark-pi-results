// Server-side formatting helpers.

export { humanize, dexNumber } from './shared.js';

/** The `names` entry whose language is English (falls back to the API name). */
export function englishName(record) {
  const entry = record?.names?.find((name) => name.language?.name === 'en');
  return entry?.name ?? null;
}

/** Last English flavor text, with every run of whitespace collapsed. */
export function latestEnglishFlavor(flavorTextEntries) {
  const entries = (flavorTextEntries ?? []).filter((entry) => entry.language?.name === 'en');
  const last = entries.at(-1);
  if (!last) return null;
  return last.flavor_text.replace(/\s+/g, ' ').trim();
}

/** Collapse whitespace runs (for effect texts). */
export function collapseWhitespace(text) {
  return text == null ? null : String(text).replace(/\s+/g, ' ').trim();
}

/** The English `short_effect` of an effect-entries list. */
export function englishShortEffect(effectEntries) {
  const entry = (effectEntries ?? []).find((effect) => effect.language?.name === 'en');
  return entry?.short_effect ? collapseWhitespace(entry.short_effect) : null;
}

/** The English genus of a species (`Mouse Pokémon`). */
export function englishGenus(species) {
  const genus = (species?.genera ?? []).find((entry) => entry.language?.name === 'en');
  return genus?.genus ?? null;
}

export const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export function statLabel(apiName) {
  return STAT_LABELS[apiName] ?? null;
}

/** Decimetres → `0.4 m`. */
export function formatHeight(decimetres) {
  return `${(decimetres / 10).toFixed(1)} m`;
}

/** Hectograms → `6.0 kg`. */
export function formatWeight(hectograms) {
  return `${(hectograms / 10).toFixed(1)} kg`;
}
