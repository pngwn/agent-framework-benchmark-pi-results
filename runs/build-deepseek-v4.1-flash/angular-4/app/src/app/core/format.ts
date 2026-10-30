import type { LocalizedName } from './models';

/** Capitalize each hyphen-separated word: mr-mime -> Mr Mime. */
export function humanize(name: string): string {
  return String(name)
    .split('-')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function padDex(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function idFromUrl(url: string | undefined | null): number {
  if (!url) return 0;
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

export function englishName(names: LocalizedName[] | undefined, fallback: string): string {
  return names?.find((entry) => entry.language.name === 'en')?.name ?? humanize(fallback);
}

export function englishShortEffect(
  entries: { language: { name: string }; short_effect: string }[] | undefined,
): string | null {
  const entry = entries?.find((item) => item.language.name === 'en' && item.short_effect);
  return entry?.short_effect.trim() || null;
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** The last English flavor text, with all whitespace collapsed. */
export function latestEnglishFlavor(
  entries: { flavor_text: string; language: { name: string } }[] | undefined,
): string | null {
  if (!entries) return null;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry.language.name === 'en') {
      return collapseWhitespace(entry.flavor_text);
    }
  }
  return null;
}

export function displayValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
