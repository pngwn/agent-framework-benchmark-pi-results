/** Pure formatting helpers shared by server and client code. */

/** `mr-mime` -> `Mr Mime`, `thunder-punch` -> `Thunder Punch` */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** 25 -> `#0025` */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export interface NamedEntry {
  name: string;
  language: { name: string };
}

/** The English entry of a PokeAPI `names` array. */
export function englishName(names: NamedEntry[] | null | undefined): string | null {
  return names?.find((n) => n.language?.name === 'en')?.name ?? null;
}

/** Collapse every run of whitespace (including \n and \f) to a single space. */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export interface FlavorTextEntry {
  flavor_text: string;
  language: { name: string };
}

/** The last English flavor text entry, whitespace-collapsed. */
export function latestEnglishFlavorText(entries: FlavorTextEntry[] | null | undefined): string | null {
  if (!entries) return null;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].language?.name === 'en') return collapseWhitespace(entries[i].flavor_text);
  }
  return null;
}

/** Number or em dash when missing. */
export function orDash(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value);
}
