/** Helpers shared by server data assembly and client components. */

export function idFromUrl(url: string): number {
  const parts = url.replace(/\/+$/, "").split("/");
  return Number(parts[parts.length - 1]);
}

/** `mr-mime` -> `Mr Mime` */
export function humanize(name: string): string {
  return name
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** English name from a `names` array, if any. */
export function enName(names: any[] | undefined | null): string | null {
  return names?.find((n) => n?.language?.name === "en")?.name ?? null;
}

/** Last English flavor text with all whitespace runs collapsed. */
export function latestEnFlavor(entries: any[] | undefined | null): string | null {
  if (!entries) return null;
  const en = entries.filter((e) => e?.language?.name === "en");
  const last = en[en.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, " ").trim() : null;
}

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

export function statLabel(name: string): string {
  return STAT_LABELS[name] ?? humanize(name);
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export const EM_DASH = "—";

export function displayValue(value: number | null | undefined): string | number {
  return value === null || value === undefined ? EM_DASH : value;
}
