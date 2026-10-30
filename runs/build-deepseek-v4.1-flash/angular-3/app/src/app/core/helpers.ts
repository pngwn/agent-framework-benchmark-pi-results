export interface NamedRef {
  name: string;
  url: string;
}

export interface LanguageName {
  name: string;
  language: NamedRef;
}

export interface ApiListResponse<T = NamedRef> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);
}

export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function englishName(names: LanguageName[] | undefined, fallback: string): string {
  return names?.find((entry) => entry.language.name === 'en')?.name ?? humanize(fallback);
}

export function englishText<T extends { language: NamedRef }>(entries: T[] | undefined): T | undefined {
  return entries?.find((entry) => entry.language.name === 'en');
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function latestEnglishFlavor(
  entries: { flavor_text: string; language: NamedRef }[] | undefined,
): string | undefined {
  if (!entries) return undefined;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].language.name === 'en') return collapseWhitespace(entries[i].flavor_text);
  }
  return undefined;
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function isAlternateForm(url: string): boolean {
  return idFromUrl(url) > 10000;
}

export function formatDecimal(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined) return '—';
  return `${(value / 10).toFixed(1)} ${unit}`;
}

export function displayValue(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value);
}
