/** Helpers for working with PokeAPI data. */

export interface NamedResource {
  name: string;
  url: string;
}

export interface LocalizedName {
  name: string;
  language: NamedResource;
}

export interface FlavorTextEntry {
  flavor_text: string;
  language: NamedResource;
}

/** mr-mime -> Mr Mime */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** Numeric id from a resource URL such as ".../pokemon-species/25/". */
export function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : NaN;
}

/** English display name of a resource, falling back to the humanized API name. */
export function englishName(resource: { name: string; names?: LocalizedName[] }): string {
  return resource.names?.find((n) => n.language.name === 'en')?.name ?? humanize(resource.name);
}

/** Last English flavor text with all whitespace runs collapsed to single spaces. */
export function latestEnglishFlavor(entries: FlavorTextEntry[] | undefined): string | null {
  const english = entries?.filter((e) => e.language.name === 'en');
  const last = english?.[english.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

/** #0025 */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

/** Missing values are shown as an em dash. */
export function orDash(value: number | null | undefined): string {
  return value == null ? '—' : String(value);
}
