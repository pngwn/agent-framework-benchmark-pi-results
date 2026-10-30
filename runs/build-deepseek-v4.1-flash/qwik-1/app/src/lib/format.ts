export interface NamedApiResource {
  name: string;
  url: string;
}

export interface LanguageNamed {
  name: string;
  language: NamedApiResource;
}

export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');
}

export function englishName(value: { name: string; names?: LanguageNamed[] }): string {
  const entry = value.names?.find((n) => n.language.name === 'en');
  return entry?.name ?? humanize(value.name);
}

export function latestEnglishFlavorText(value: {
  flavor_text_entries?: Array<{ flavor_text: string; language: NamedApiResource }>;
}): string {
  const entries = value.flavor_text_entries?.filter((entry) => entry.language.name === 'en') ?? [];
  if (!entries.length) return '—';
  return entries[entries.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
}

export function englishShortEffect(value: {
  effect_entries?: Array<{
    short_effect: string;
    language: NamedApiResource;
  }>;
}): string | undefined {
  return value.effect_entries?.find((entry) => entry.language.name === 'en')?.short_effect;
}

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1] ?? 0);
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function displayValue(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value);
}

export function humanizedMethodOrder(name: string): number {
  const order = ['level-up', 'machine', 'egg', 'tutor'];
  const index = order.indexOf(name);
  return index === -1 ? order.length : index;
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
