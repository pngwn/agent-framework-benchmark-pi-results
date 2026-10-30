export function humanize(name) {
  if (!name) return '';
  return String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function englishName(resource, fallbackName) {
  const entry = resource?.names?.find((item) => item.language?.name === 'en');
  return entry?.name || humanize(resource?.name || fallbackName || '');
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function latestEnglishFlavorText(entries) {
  const english = (entries || []).filter((entry) => entry.language?.name === 'en');
  const latest = english.at(-1);
  return latest ? latest.flavor_text.replace(/\s+/g, ' ').trim() : '';
}

export function idFromUrl(url) {
  const match = String(url || '').match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function displayValue(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

export function formatMetric(value) {
  return value == null ? '—' : (Number(value) / 10).toFixed(1);
}

export const TYPE_NAMES = new Set([
  'normal',
  'fighting',
  'flying',
  'poison',
  'ground',
  'rock',
  'bug',
  'ghost',
  'steel',
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'ice',
  'dragon',
  'dark',
  'fairy',
]);

export const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export const DAMAGE_CLASS_LABELS = {
  physical: 'Physical',
  special: 'Special',
  status: 'Status',
};
