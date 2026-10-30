export type Named = { name: string; url: string };
type Localized = { language: Named };

export const MISSING = '—';

/** `thunder-punch` → `Thunder Punch` */
export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** `25` → `#0025` */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

/** Numeric ID at the end of an API resource URL. */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

function isEnglish(entry: Localized): boolean {
  return entry.language?.name === 'en';
}

export function englishName(names: ({ name: string } & Localized)[] | undefined, fallback: string): string {
  return names?.find(isEnglish)?.name ?? humanize(fallback);
}

export function englishGenus(genera: ({ genus: string } & Localized)[] | undefined): string | undefined {
  return genera?.find(isEnglish)?.genus;
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function latestFlavorText(entries: ({ flavor_text: string } & Localized)[] | undefined): string | undefined {
  const english = entries?.filter(isEnglish) ?? [];
  const last = english.at(-1);
  return last ? collapseWhitespace(last.flavor_text) : undefined;
}

export function englishShortEffect(entries: ({ short_effect: string } & Localized)[] | undefined): string | undefined {
  const entry = entries?.find(isEnglish);
  return entry ? collapseWhitespace(entry.short_effect) : undefined;
}

export function orMissing(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === '' ? MISSING : String(value);
}
