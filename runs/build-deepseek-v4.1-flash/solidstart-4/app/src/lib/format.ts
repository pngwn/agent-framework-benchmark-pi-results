export function humanize(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function englishName(names: { name: string; language: { name: string } }[] | null | undefined): string | undefined {
  return names?.find((entry) => entry.language?.name === "en")?.name;
}

export function latestEnglishFlavor(
  entries: { flavor_text: string; language: { name: string } }[] | null | undefined,
): string | undefined {
  const english = entries?.filter((entry) => entry.language?.name === "en");
  return english?.length ? english[english.length - 1].flavor_text : undefined;
}

export function collapseWhitespace(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function formatMeasurement(value: number | null | undefined, unit: "m" | "kg"): string {
  if (value == null) return "—";
  return `${(value / 10).toFixed(1)} ${unit}`;
}

export function displayValue(value: number | null | undefined): string {
  return value == null ? "—" : String(value);
}

export function statLabel(name: string): string {
  const labels: Record<string, string> = {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    "special-attack": "Sp. Atk",
    "special-defense": "Sp. Def",
    speed: "Speed",
  };
  return labels[name] ?? humanize(name);
}
