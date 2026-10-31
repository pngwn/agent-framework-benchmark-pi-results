export interface NamedRef {
  name: string;
  url: string;
}

export interface NameEntry {
  name: string;
  language: NamedRef;
}

export interface FlavorEntry {
  flavor_text: string;
  language: NamedRef;
}

/** Extracts the numeric id from an API resource URL (`.../pokemon/25/` -> 25). */
export function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : 0;
}

/** `mr-mime` -> `Mr Mime`, `thunder-punch` -> `Thunder Punch`. */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** The English entry of a `names` array, if any. */
export function englishName(names: NameEntry[] | null | undefined): string | null {
  return names?.find((entry) => entry.language?.name === 'en')?.name ?? null;
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The last English flavor text entry, with whitespace collapsed. */
export function latestEnglishFlavor(entries: FlavorEntry[] | null | undefined): string | null {
  if (!entries) return null;
  const english = entries.filter((entry) => entry.language?.name === 'en');
  if (!english.length) return null;
  return collapseWhitespace(english[english.length - 1].flavor_text);
}

/** `#0025` style dex number. */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

/** Missing values are shown as an em dash. */
export function display(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}
