import { LanguageRef, NameEntry } from './pokeapi.models';

export function humanize(name: string): string {
  return name
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function englishName(entries: NameEntry[] | undefined): string | undefined {
  return entries?.find((entry) => entry.language.name === 'en')?.name;
}

export function englishGeneric<T extends { language: LanguageRef }>(
  entries: T[] | undefined,
): T | undefined {
  const english = entries?.filter((entry) => entry.language.name === 'en');
  return english?.length ? english[english.length - 1] : undefined;
}

export function collapseWhitespace(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

export function idFromUrl(url: string | undefined | null): number | null {
  const match = url?.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'en', { sensitivity: 'base' });
}

export function damageClassName(name: string): string {
  switch (name) {
    case 'physical':
      return 'Physical';
    case 'special':
      return 'Special';
    case 'status':
      return 'Status';
    default:
      return humanize(name);
  }
}

export function statLabel(name: string): string {
  switch (name) {
    case 'hp':
      return 'HP';
    case 'attack':
      return 'Attack';
    case 'defense':
      return 'Defense';
    case 'special-attack':
      return 'Sp. Atk';
    case 'special-defense':
      return 'Sp. Def';
    case 'speed':
      return 'Speed';
    default:
      return humanize(name);
  }
}
