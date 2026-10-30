export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
export const SPRITE_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="8" fill="#eef1f5"/><circle cx="48" cy="48" r="18" fill="#cdd4de"/></svg>',
  );

export function humanize(name = '') {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function englishName(resource, fallbackName) {
  const entry = resource?.names?.find((n) => n.language?.name === 'en');
  return entry?.name ?? humanize(fallbackName ?? resource?.name ?? '');
}

export function englishGenus(species) {
  return species?.genera?.find((g) => g.language?.name === 'en')?.genus ?? '—';
}

export function latestEnglishFlavor(entries) {
  if (!Array.isArray(entries)) return null;
  const english = entries.filter((entry) => entry.language?.name === 'en');
  const last = english[english.length - 1];
  if (!last || typeof last.flavor_text !== 'string') return null;
  return last.flavor_text.replace(/\s+/g, ' ').trim();
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function formatDecimal(value, unit) {
  if (value == null) return '—';
  return `${(value / 10).toFixed(1)} ${unit}`;
}

export function displayValue(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

export function idFromUrl(url) {
  if (!url) return null;
  const match = String(url).match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function isAlternateForm(id) {
  return typeof id === 'number' && id >= 10000;
}

export const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export function statLabel(name) {
  return STAT_LABELS[name] ?? humanize(name);
}

export function typeSlug(name) {
  return String(name ?? '').toLowerCase();
}

export function typeColorStyle(name) {
  return { backgroundColor: `var(--type-${typeSlug(name)}, var(--type-normal))` };
}
