export function humanize(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function englishName(
  names: Array<{ name: string; language?: { name: string } }> | undefined,
  fallback: string,
): string {
  return names?.find((entry) => entry.language?.name === "en")?.name ?? humanize(fallback);
}

export function latestEnglishFlavor(
  entries: Array<{ flavor_text: string; language?: { name: string } }> | undefined,
): string {
  const english = entries?.filter((entry) => entry.language?.name === "en") ?? [];
  const text = english.length ? english[english.length - 1].flavor_text : "—";
  return text.replace(/\s+/g, " ").trim();
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function displayValue(value: number | null | undefined): string | number {
  return value === null || value === undefined ? "—" : value;
}

export function metre(value: number): string {
  return `${(value / 10).toFixed(1)} m`;
}

export function kilogram(value: number): string {
  return `${(value / 10).toFixed(1)} kg`;
}
