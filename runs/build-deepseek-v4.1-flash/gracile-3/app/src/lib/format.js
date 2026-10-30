export const TYPE_EXCLUDED = new Set(['stellar', 'unknown', 'shadow']);

export function humanize(name = '') {
  return String(name)
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ')
    .trim();
}

export function englishName(record, fallback = '') {
  return record?.names?.find((entry) => entry.language?.name === 'en')?.name || fallback || record?.name || '';
}

export function englishGenus(species) {
  return species?.genera?.find((entry) => entry.language?.name === 'en')?.genus || '—';
}

export function latestEnglishFlavor(entries = []) {
  const english = entries.filter((entry) => entry.language?.name === 'en');
  const text = english.at(-1)?.flavor_text;
  return text ? String(text).replace(/\s+/g, ' ').trim() : null;
}

export function latestEnglishEffect(entries = []) {
  return entries.find((entry) => entry.language?.name === 'en')?.short_effect || null;
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function decimal(value, unit) {
  return `${(Number(value) / 10).toFixed(1)} ${unit}`;
}

export function valueOrDash(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export function statLabel(name) {
  return STAT_LABELS[name] || humanize(name);
}

export function resourceId(url) {
  const match = String(url || '').match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function resourcePath(url) {
  if (!url) return null;
  try {
    const pathname = new URL(url, 'http://localhost').pathname;
    const match = pathname.match(/\/api\/v2\/(.*)$/);
    return match ? match[1].replace(/^\/+/, '') : null;
  } catch {
    return null;
  }
}

export function isDefaultPokemonId(id) {
  return Number(id) > 0 && Number(id) <= 10000;
}
