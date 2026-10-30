export function humanize(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function englishName(
  names: Array<{ name?: string; language?: { name?: string } }> | undefined,
  fallback: string,
): string {
  return names?.find((entry) => entry.language?.name === "en")?.name || fallback;
}

export function latestEnglishFlavor(
  entries:
    | Array<{ flavor_text?: string; language?: { name?: string } }>
    | undefined,
): string | null {
  if (!entries) return null;
  const english = entries.filter((entry) => entry.language?.name === "en");
  const last = english[english.length - 1];
  return last?.flavor_text ? collapseWhitespace(last.flavor_text) : null;
}

export function displayMissing(value: unknown): string {
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value);
}

export const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

export const TYPE_NAMES = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
] as const;

export const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);
