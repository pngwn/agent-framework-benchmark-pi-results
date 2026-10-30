export function humanize(name: string): string {
  return String(name ?? "")
    .split("-")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function englishField(
  record: { names?: { name: string; language?: { name?: string } }[]; name?: string } | null | undefined,
): string {
  const found = record?.names?.find((entry) => entry.language?.name === "en");
  return found?.name ?? humanize(record?.name ?? "");
}

export function englishName(record: any): string {
  return englishField(record);
}

export function englishGenus(
  record: { genera?: { genus: string; language?: { name?: string } }[] } | null | undefined,
): string {
  return record?.genera?.find((entry) => entry.language?.name === "en")?.genus ?? "";
}

export function latestEnglishFlavor(
  record: { flavor_text_entries?: { flavor_text: string; language?: { name?: string } }[] } | null | undefined,
): string {
  const entries = (record?.flavor_text_entries ?? []).filter((entry) => entry.language?.name === "en");
  const entry = entries[entries.length - 1];
  return entry ? collapseWhitespace(entry.flavor_text) : "";
}

export function englishShortEffect(
  record: { effect_entries?: { short_effect?: string; language?: { name?: string } }[] } | null | undefined,
): string {
  const entries = (record?.effect_entries ?? []).filter((entry) => entry.language?.name === "en");
  return entries.find((entry) => entry.short_effect)?.short_effect ?? "";
}

export function collapseWhitespace(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function displayMissing(value: unknown): string {
  return value === null || value === undefined || value === "" ? "\u2014" : String(value);
}

export const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

export const DAMAGE_CLASS_LABELS: Record<string, string> = {
  physical: "Physical",
  special: "Special",
  status: "Status",
};

export function damageClassLabel(name: string | undefined): string {
  return (name && DAMAGE_CLASS_LABELS[name]) || humanize(name ?? "");
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export const LEARN_METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];
