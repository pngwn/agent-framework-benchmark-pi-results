import { FlavorTextEntry, LangName } from './models';

/** Extracts the numeric id from an API resource URL. */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

/** `mr-mime` -> `Mr Mime` */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** The English name from a `names` array, falling back to the humanized API name. */
export function englishName(names: LangName[] | undefined | null, fallback: string): string {
  return names?.find((n) => n.language.name === 'en')?.name ?? humanize(fallback);
}

/** `#0025` */
export function dexNumber(id: number): string {
  return '#' + String(id).padStart(4, '0');
}

/** Collapses every run of whitespace (including \n and \f) to a single space. */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The last English flavor text entry, whitespace-collapsed. */
export function latestEnglishFlavor(entries: FlavorTextEntry[] | undefined | null): string | null {
  const en = entries?.filter((e) => e.language.name === 'en') ?? [];
  return en.length ? collapseWhitespace(en[en.length - 1].flavor_text) : null;
}

/** Document title for a page whose h1 is `heading`. */
export function pageTitle(heading: string): string {
  return `${heading} \u2013 Pokédex`;
}
