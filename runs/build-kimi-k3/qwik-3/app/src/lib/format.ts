/**
 * Formatting helpers shared between server (loaders) and client (components).
 */

/** An API name with each `-`-separated word capitalized and joined by spaces. */
export function humanize(name: string): string {
  return name
    .split("-")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** Extract the numeric id from a PokeAPI resource URL. */
export function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url ?? "");
  return match ? Number(match[1]) : NaN;
}

interface NamedEntry {
  name: string;
  language?: { name?: string };
}

/** The English name from a `names` array, if present. */
export function englishName(names?: NamedEntry[] | null): string | null {
  return names?.find((n) => n.language?.name === "en")?.name ?? null;
}

interface FlavorEntry {
  flavor_text: string;
  language?: { name?: string };
}

/**
 * The last `flavor_text_entries` entry whose language is English, with every
 * run of whitespace collapsed to a single space.
 */
export function latestEnglishFlavor(
  entries?: FlavorEntry[] | null,
): string | null {
  if (!entries) return null;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].language?.name === "en") {
      return entries[i].flavor_text.replace(/\s+/g, " ").trim();
    }
  }
  return null;
}

/** Dex number: `#` plus four zero-padded digits. */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}
