export const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

export type NamedRef = { name: string; url: string };

export type SpeciesListItem = {
  id: number;
  name: string;
  label: string;
  sprite: string;
};

export type PokemonCardData = SpeciesListItem & { hidden?: boolean };

export type TypeInfo = {
  name: string;
  label: string;
  order: number;
  detail: any;
};

export type GenerationInfo = {
  name: string;
  label: string;
  order: number;
  detail: any;
};

export function idFromUrl(url: string | undefined | null): number {
  const match = url?.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

export function humanize(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function englishName(entries: any[] | undefined | null, field = "name"): string | null {
  return (entries ?? []).find((entry) => entry?.language?.name === "en")?.[field] ?? null;
}

export function latestEnglishFlavor(entries: any[] | undefined | null): string | null {
  const english = (entries ?? []).filter((entry) => entry?.language?.name === "en");
  const latest = english[english.length - 1];
  return latest?.flavor_text ? collapseWhitespace(latest.flavor_text) : null;
}
