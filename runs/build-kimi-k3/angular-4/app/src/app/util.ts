/** Humanize an API name: capitalize each dash-separated word (`mr-mime` → `Mr Mime`). */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** Extract the numeric id from a resource URL ending in `/<id>/`. */
export function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : NaN;
}

/** Dex number: `#` plus four zero-padded digits. */
export function dexNumber(id: number): string {
  return '#' + String(id).padStart(4, '0');
}

interface LocalizedName {
  name: string;
  language: { name: string };
}

/** The English entry of a `names` list, with a fallback. */
export function englishName(names: LocalizedName[] | undefined, fallback: string): string {
  return names?.find((n) => n.language.name === 'en')?.name ?? fallback;
}

interface FlavorTextEntry {
  flavor_text: string;
  language: { name: string };
}

/**
 * The last English flavor text entry, with every run of whitespace
 * collapsed to a single space. Null when there is no English entry.
 */
export function latestEnglishFlavor(entries: FlavorTextEntry[] | undefined): string | null {
  const english = entries?.filter((e) => e.language.name === 'en');
  if (!english?.length) return null;
  return english[english.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
}

/** Display a nullable numeric value, using an em dash for missing values. */
export function orDash(value: number | null | undefined): string {
  return value == null ? '—' : String(value);
}
