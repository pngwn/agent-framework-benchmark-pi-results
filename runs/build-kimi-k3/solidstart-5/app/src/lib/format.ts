/** "mr-mime" -> "Mr Mime" */
export const humanize = (name: string): string =>
  name
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");

/** 25 -> "#0025" */
export const dexNumber = (id: number): string => `#${String(id).padStart(4, "0")}`;

/** ".../pokemon/25/" -> 25 */
export const idFromUrl = (url: string): number => {
  const m = /\/(\d+)\/?$/.exec(url ?? "");
  return m ? Number(m[1]) : NaN;
};

/** English name from a resource's `names` list, humanized API name as fallback. */
export const enName = (resource: any): string =>
  resource?.names?.find((n: any) => n?.language?.name === "en")?.name ??
  (resource?.name ? humanize(resource.name) : "");

export const collapseWs = (s: string): string => String(s).replace(/\s+/g, " ").trim();

/** Last English flavor text entry, whitespace collapsed. */
export const latestEnFlavor = (entries: any[]): string | null => {
  if (!Array.isArray(entries)) return null;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i]?.language?.name === "en") return collapseWs(entries[i].flavor_text);
  }
  return null;
};

/** English short_effect from an effect_entries list. */
export const enShortEffect = (entries: any[]): string | null => {
  const e = entries?.find((x: any) => x?.language?.name === "en");
  return e ? collapseWs(e.short_effect) : null;
};

/** Missing values are shown as an em dash. */
export const dash = (v: number | null | undefined): string => (v == null ? "—" : String(v));

/** Alternate forms (Pokémon IDs above 10000) are out of scope. */
export const isDefaultPokemonId = (id: number): boolean => Number.isFinite(id) && id < 10000;
