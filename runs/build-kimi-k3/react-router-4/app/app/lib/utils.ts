// Shared helpers usable on both server and client.

/** `mr-mime` -> `Mr Mime`, `thunder-punch` -> `Thunder Punch` */
export function humanize(name: string): string {
  return name
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Extract the numeric id from a PokeAPI resource URL. */
export function idFromUrl(url: string): number {
  const m = /\/(\d+)\/?$/.exec(url);
  return m ? Number(m[1]) : NaN;
}

/** English display name from a record's `names` list, falling back to the humanized API name. */
export function englishName(record: any): string {
  const entry = record?.names?.find((n: any) => n.language?.name === "en");
  return entry ? entry.name : humanize(record?.name ?? "");
}

/** Latest English flavor text, whitespace collapsed. */
export function latestEnglishFlavor(record: any): string | null {
  const entries = (record?.flavor_text_entries ?? []).filter(
    (e: any) => e.language?.name === "en",
  );
  if (!entries.length) return null;
  return collapse(entries[entries.length - 1].flavor_text);
}

/** English short effect, whitespace collapsed. */
export function englishShortEffect(record: any): string | null {
  const entry = (record?.effect_entries ?? []).find(
    (e: any) => e.language?.name === "en",
  );
  return entry ? collapse(entry.short_effect) : null;
}

export function collapse(text: string): string {
  return String(text).replace(/\s+/g, " ").trim();
}

/** `#0025` */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

/** English genus, e.g. `Mouse Pokémon`. */
export function englishGenus(species: any): string {
  const entry = (species?.genera ?? []).find((g: any) => g.language?.name === "en");
  return entry ? entry.genus : "";
}

export const STAT_LABELS: Record<string, string> = {
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
