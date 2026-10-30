export function humanize(name: string): string {
  return name
    .split("-")
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function englishName(entries: Array<{ name: string; language: { name: string } }> | undefined): string | undefined {
  return entries?.find((entry) => entry.language?.name === "en")?.name;
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function latestEnglishFlavor(
  entries: Array<{ flavor_text: string; language: { name: string } }> | undefined,
): string {
  const english = entries?.filter((entry) => entry.language?.name === "en") ?? [];
  const latest = english[english.length - 1];
  return latest ? collapseWhitespace(latest.flavor_text) : "";
}

export function englishShortEffect(
  entries: Array<{ short_effect: string; language: { name: string } }> | undefined,
): string | undefined {
  const entry = entries?.find((item) => item.language?.name === "en");
  return entry?.short_effect ? collapseWhitespace(entry.short_effect) : undefined;
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

export function displayValue(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : String(value);
}
