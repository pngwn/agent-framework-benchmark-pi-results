export type NamedResource = { name: string; url: string };
export type Translated = { name: string; language: NamedResource };

export const MISSING = "—";

/** `mr-mime` → `Mr Mime` */
export function humanize(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function englishName(names: Translated[] | undefined, fallback: string): string {
  return names?.find((n) => n.language.name === "en")?.name ?? humanize(fallback);
}

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1]);
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** The last English flavor text entry, whitespace collapsed. */
export function latestFlavorText(
  entries: { flavor_text: string; language: NamedResource }[] | undefined,
): string | null {
  const english = (entries ?? []).filter((e) => e.language.name === "en");
  const last = english[english.length - 1];
  return last ? cleanText(last.flavor_text) : null;
}

export function orMissing(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === "" ? MISSING : String(value);
}

export function pageTitle(heading: string): string {
  return `${heading} – Pokédex`;
}
