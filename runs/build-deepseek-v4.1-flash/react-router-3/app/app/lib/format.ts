export function humanize(name: string | null | undefined): string {
  if (!name) return "—";
  return name
    .split("-")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function englishName(resource: any): string | undefined {
  return resource?.names?.find((entry: any) => entry.language?.name === "en")?.name;
}

export function displayName(resource: any): string {
  return englishName(resource) ?? humanize(resource?.name);
}

export function latestEnglishFlavorText(entries: any[] | null | undefined): string | undefined {
  if (!Array.isArray(entries)) return undefined;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i]?.language?.name === "en") {
      const text = String(entries[i].flavor_text ?? "").replace(/\s+/g, " ").trim();
      if (text) return text;
    }
  }
  return undefined;
}

export function dexNumber(id: number | string): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function inMetres(decimetres: number | null | undefined): string {
  return typeof decimetres === "number" ? `${(decimetres / 10).toFixed(1)} m` : "—";
}

export function inKilograms(hectograms: number | null | undefined): string {
  return typeof hectograms === "number" ? `${(hectograms / 10).toFixed(1)} kg` : "—";
}

export function orDash(value: unknown): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
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

export function titleFor(name: string | undefined): string {
  return name ? `${name} – Pokédex` : "Pokédex";
}
