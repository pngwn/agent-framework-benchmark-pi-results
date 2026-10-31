// Shared formatting helpers (safe to use on both server and client).

export interface NamedResource {
  name: string;
  url: string;
}

export interface LocalizedName {
  name: string;
  language: NamedResource;
}

/** `mr-mime` -> `Mr Mime`, `thunder-punch` -> `Thunder Punch`. */
export function humanize(name: string): string {
  return name
    .split("-")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** The English name from a resource's `names` list, falling back to the humanized API name. */
export function englishName(resource: { name: string; names?: LocalizedName[] }): string {
  const en = resource.names?.find((n) => n.language.name === "en");
  return en?.name ?? humanize(resource.name);
}

/** Extract the numeric id from a resource URL (`.../pokemon/25/` -> 25). */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

/** `#0025` style dex number. */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

/** Latest English flavor text with all whitespace runs collapsed to single spaces. */
export function latestEnglishFlavor(
  entries: { flavor_text: string; language: NamedResource }[] | undefined,
): string | null {
  if (!entries) return null;
  const en = entries.filter((e) => e.language.name === "en");
  const last = en[en.length - 1];
  if (!last) return null;
  return last.flavor_text.replace(/\s+/g, " ").trim();
}

export const EM_DASH = "—";
