/** Humanize an API name: each `-`-separated word capitalized, joined by spaces. */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Extract the numeric id from an API resource URL. */
export function idFromUrl(url: string): number {
  const m = /\/(\d+)\/?$/.exec(url);
  return m ? Number(m[1]) : NaN;
}

interface LocalizedName {
  name: string;
  language?: { name: string } | null;
}

/** English name from a `names` array, falling back to the humanized API name. */
export function englishName(names: LocalizedName[] | null | undefined, apiName: string): string {
  const en = names?.find((n) => n.language?.name === 'en');
  return en?.name ?? humanize(apiName);
}

/** Latest English flavor text, whitespace collapsed. */
export function latestEnglishFlavorText(entries: any[] | null | undefined): string | null {
  if (!entries) return null;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e?.language?.name === 'en' && typeof e.flavor_text === 'string') {
      return e.flavor_text.replace(/\s+/g, ' ').trim();
    }
  }
  return null;
}

/** English genus (e.g. "Mouse Pokémon"). */
export function englishGenus(genera: any[] | null | undefined): string | null {
  const en = genera?.find((g) => g?.language?.name === 'en');
  return en?.genus ?? null;
}

/** `#0025`-style dex number. */
export function dexNumber(id: number): string {
  return '#' + String(id).padStart(4, '0');
}

export const EM_DASH = '\u2014';

/** Show a possibly-missing numeric value, using an em dash for missing values. */
export function showMissing(value: number | null | undefined): string | number {
  return value == null ? EM_DASH : value;
}
