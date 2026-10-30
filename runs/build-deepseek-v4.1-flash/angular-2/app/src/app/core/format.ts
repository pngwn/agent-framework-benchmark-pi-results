import { FlavorText, LocalizedName, NamedRef } from './models';

/** `mr-mime` -> `Mr Mime`, `thunder-punch` -> `Thunder Punch`. */
export function humanize(name: string): string {
  return name
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function englishName(names: LocalizedName[] | undefined, fallback: string): string {
  return names?.find((entry) => entry.language?.name === 'en')?.name ?? humanize(fallback);
}

/** The last English flavor text, with all whitespace collapsed to single spaces. */
export function latestEnglishFlavor(entries: FlavorText[] | undefined): string | null {
  if (!entries) return null;
  const english = entries.filter((entry) => entry.language?.name === 'en');
  if (!english.length) return null;
  return english[english.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
}

export function idFromUrl(url: string): number | null {
  const match = url?.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function statLabel(name: string): string {
  const labels: Record<string, string> = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
  };
  return labels[name] ?? humanize(name);
}

export function damageClassLabel(name: string): string {
  return humanize(name);
}

export function typeVarName(name: string): string {
  return `--type-${name}`;
}

export function isDefaultPokemonRef(ref: NamedRef): boolean {
  const id = idFromUrl(ref.url);
  return id !== null && id <= 10000;
}

export function uniqueByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}
