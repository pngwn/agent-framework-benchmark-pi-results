export interface Localized {
  name: string;
  language: { name: string } & Record<string, unknown>;
}

export function englishName(items: Localized[] | undefined | null, fallback: string): string {
  const found = (items ?? []).find((item) => item.language?.name === "en");
  return found?.name ?? humanize(fallback);
}

export function humanize(name: string): string {
  return name
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function formatDex(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function displayValue(value: unknown): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

export function latestEnglishFlavor(entries: any[] | undefined | null): string {
  const english = (entries ?? []).filter((entry) => entry.language?.name === "en");
  const latest = english.at(-1);
  return latest ? String(latest.flavor_text).replace(/\s+/g, " ").trim() : "";
}

export function englishEffect(entries: any[] | undefined | null): string {
  const found = (entries ?? []).find((entry) => entry.language?.name === "en");
  return found?.short_effect ? String(found.short_effect).replace(/\s+/g, " ").trim() : "";
}

export function formatMetres(value: number): string {
  return `${(value / 10).toFixed(1)} m`;
}

export function formatKilograms(value: number): string {
  return `${(value / 10).toFixed(1)} kg`;
}

export const TYPE_NAMES: Record<string, string> = {
  normal: "Normal",
  fighting: "Fighting",
  flying: "Flying",
  poison: "Poison",
  ground: "Ground",
  rock: "Rock",
  bug: "Bug",
  ghost: "Ghost",
  steel: "Steel",
  fire: "Fire",
  water: "Water",
  grass: "Grass",
  electric: "Electric",
  psychic: "Psychic",
  ice: "Ice",
  dragon: "Dragon",
  dark: "Dark",
  fairy: "Fairy",
};

export function typeLabel(name: string): string {
  return TYPE_NAMES[name] ?? humanize(name);
}
