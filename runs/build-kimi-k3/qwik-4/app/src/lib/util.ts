// Pure helpers shared by server loaders and client components.

/** Capitalize each `-`-separated word: "mr-mime" -> "Mr Mime". */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export interface LangName {
  name: string;
  language: { name: string };
}

/** English entry from a `names` array. */
export function englishName(names: LangName[] | null | undefined): string | null {
  return names?.find((n) => n.language.name === 'en')?.name ?? null;
}

export interface FlavorEntry {
  flavor_text: string;
  language: { name: string };
}

/** Latest English flavor text with all whitespace runs collapsed. */
export function latestEnglishFlavorText(entries: FlavorEntry[] | null | undefined): string | null {
  if (!entries) return null;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].language.name === 'en') {
      return entries[i].flavor_text.replace(/\s+/g, ' ').trim();
    }
  }
  return null;
}

/** Numeric id from a resource URL (".../pokemon-species/25/" -> 25). */
export function idFromUrl(url: string): number {
  const m = url.match(/\/(\d+)\/?$/);
  return m ? Number(m[1]) : NaN;
}

/** Dex number display: 25 -> "#0025". */
export function dexNo(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

/** Alternate Pokémon forms (ids above 10000) are out of scope. */
export function isDefaultPokemonId(id: number): boolean {
  return id > 0 && id < 10000;
}

/** Front sprite URL pattern for a species/default Pokémon id. */
export function spriteUrlForId(apiBase: string, id: number): string {
  return `${apiBase}/media/sprites/pokemon/${id}.png`;
}

/** Resolve a (possibly relative) media URL from API data to an absolute one. */
export function mediaUrl(apiBase: string, url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
}
