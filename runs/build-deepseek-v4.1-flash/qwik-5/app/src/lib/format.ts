export interface NamedRef {
  name: string;
  url: string;
}

export interface LocalizedName {
  name: string;
  language: NamedRef;
}

export interface FlavorTextEntry {
  flavor_text: string;
  language: NamedRef;
  version_group?: NamedRef;
  version?: NamedRef;
}

export function humanize(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function englishName(
  names: LocalizedName[] | null | undefined,
  fallback: string,
): string {
  return names?.find((entry) => entry.language.name === "en")?.name ?? humanize(fallback);
}

export function englishValue(
  entries: { language: NamedRef }[] | null | undefined,
  key: "name" | "genus" | "short_effect" | "effect",
  fallback = "—",
): string {
  const entry = entries?.find((item) => item.language.name === "en") as
    | Record<string, string>
    | undefined;
  return entry?.[key] ?? fallback;
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function latestEnglishFlavor(
  entries: FlavorTextEntry[] | null | undefined,
): string | null {
  if (!entries?.length) return null;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].language.name === "en") {
      return collapseWhitespace(entries[i].flavor_text);
    }
  }
  return null;
}

export function displayValue(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : String(value);
}

export function padDexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function idFromUrl(url: string): number | null {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function humanizedMoveMethod(name: string): string {
  return humanize(name);
}

export function compareText(a: string, b: string): number {
  return a.localeCompare(b);
}
