import { apiOrigin, type ApiRecord } from './api';

const TYPE_NAMES = [
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
] as const;

export const EXCLUDED_TYPE_NAMES = new Set(['stellar', 'unknown', 'shadow']);
export const COVERED_TYPE_NAMES = new Set<string>(TYPE_NAMES);

export function humanize(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function englishName(record: ApiRecord | null | undefined, fallbackName = ''): string {
  const names = record?.names;
  if (Array.isArray(names)) {
    const english = names.find((entry: ApiRecord) => entry?.language?.name === 'en');
    if (english?.name) return String(english.name);
  }
  return humanize(record?.name || fallbackName);
}

export function englishGenus(record: ApiRecord | null | undefined): string {
  const genera = record?.genera;
  if (Array.isArray(genera)) {
    const english = genera.find((entry: ApiRecord) => entry?.language?.name === 'en');
    if (english?.genus) return String(english.genus);
  }
  return '';
}

export function englishShortEffect(record: ApiRecord | null | undefined): string {
  const entries = record?.effect_entries;
  if (Array.isArray(entries)) {
    const english = entries.find((entry: ApiRecord) => entry?.language?.name === 'en');
    if (english?.short_effect) return String(english.short_effect);
  }
  return '';
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function latestEnglishFlavor(entries: ApiRecord[] | null | undefined): string {
  if (!Array.isArray(entries)) return '';
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry?.language?.name === 'en' && entry.flavor_text) {
      return collapseWhitespace(String(entry.flavor_text));
    }
  }
  return '';
}

export function flavorWithFallback(record: ApiRecord | null | undefined): string {
  const shortEffect = englishShortEffect(record);
  if (shortEffect) return shortEffect;
  const flavor = latestEnglishFlavor(record?.flavor_text_entries);
  return flavor || '—';
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function displayNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value);
}

export function metresFromDecimetres(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${(value / 10).toFixed(1)} m`;
}

export function kilogramsFromHectograms(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${(value / 10).toFixed(1)} kg`;
}

export function typeClassName(typeName: string): string {
  return COVERED_TYPE_NAMES.has(typeName) ? `type-${typeName}` : 'type-unknown';
}

export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${apiOrigin()}${url}`;
  return `${apiOrigin()}/${url}`;
}

export function spriteUrl(pokemonId: number): string {
  return `${apiOrigin()}/media/sprites/pokemon/${pokemonId}.png`;
}

export function statLabel(statName: string): string {
  const labels: Record<string, string> = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
  };
  return labels[statName] ?? humanize(statName);
}

export function moveMethodOrder(methodName: string): [number, string] {
  const preferred = ['level-up', 'machine', 'egg', 'tutor'];
  const index = preferred.indexOf(methodName);
  return [index === -1 ? preferred.length : index, methodName];
}
