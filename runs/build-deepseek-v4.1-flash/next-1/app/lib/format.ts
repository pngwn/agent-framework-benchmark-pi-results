export interface LanguageEntry {
  name: string;
  language: { name: string };
}

export interface FlavorTextEntry {
  flavor_text: string;
  language: { name: string };
}

export interface NamedResource {
  name: string;
  url: string;
}

export interface ListResponse<T> {
  count: number;
  next: string | null;
  previous?: string | null;
  results: T[];
}

export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function englishName(entries: LanguageEntry[] | undefined, fallback: string): string {
  const entry = entries?.find((item) => item.language?.name === 'en');
  return entry?.name ?? humanize(fallback);
}

export function latestEnglishFlavor(entries: FlavorTextEntry[] | undefined): string {
  if (!entries) return '';
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].language?.name === 'en') {
      return entries[i].flavor_text.replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

export function displayValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function idFromUrl(url: string | undefined | null): number | null {
  if (!url) return null;
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export const MOVE_METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
