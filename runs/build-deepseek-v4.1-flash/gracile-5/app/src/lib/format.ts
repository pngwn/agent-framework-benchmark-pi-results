export const humanize = (name: string): string =>
  name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const englishName = (entries: any[] | null | undefined, fallback: string): string =>
  entries?.find((entry) => entry?.language?.name === 'en')?.name ?? humanize(fallback);

export const dexNumber = (id: number): string => `#${String(id).padStart(4, '0')}`;

export const latestEnglishFlavor = (entries: any[] | null | undefined): string => {
  const english = (entries ?? []).filter((entry) => entry?.language?.name === 'en');
  const text = english.at(-1)?.flavor_text ?? '';
  return String(text).replace(/\s+/g, ' ').trim();
};

export const englishGenus = (entries: any[] | null | undefined): string =>
  entries?.find((entry) => entry?.language?.name === 'en')?.genus ?? '';

export const englishShortEffect = (entries: any[] | null | undefined): string =>
  entries?.find((entry) => entry?.language?.name === 'en')?.short_effect ?? '';

export const typeLabel = (name: string): string => humanize(name);

export const statLabel = (name: string): string =>
  ({
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
  })[name] ?? humanize(name);

export const displayValue = (value: unknown): string =>
  value === null || value === undefined || value === '' ? '—' : String(value);
