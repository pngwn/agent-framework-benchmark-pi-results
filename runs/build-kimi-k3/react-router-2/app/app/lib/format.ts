// Shared formatting helpers (safe to use on both server and client).

/** mr-mime -> Mr Mime, thunder-punch -> Thunder Punch */
export function humanize(name: string): string {
  return name
    .split("-")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

interface LanguageRef {
  name: string;
}

/** English name from a `names` array, if present. */
export function enName(
  names: Array<{ name: string; language: LanguageRef }> | null | undefined,
): string | null {
  return names?.find((n) => n.language.name === "en")?.name ?? null;
}

/** English genus from a species' `genera` array, if present. */
export function enGenus(
  genera: Array<{ genus: string; language: LanguageRef }> | null | undefined,
): string | null {
  return genera?.find((g) => g.language.name === "en")?.genus ?? null;
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Latest English flavor text: last `en` entry, whitespace collapsed. */
export function latestEnFlavorText(
  entries:
    | Array<{ flavor_text: string; language: LanguageRef }>
    | null
    | undefined,
): string | null {
  const en = entries?.filter((e) => e.language.name === "en") ?? [];
  if (!en.length) return null;
  return collapseWhitespace(en[en.length - 1]!.flavor_text);
}

/** English short effect from an `effect_entries` array, if present. */
export function enShortEffect(
  entries:
    | Array<{ short_effect: string; language: LanguageRef }>
    | null
    | undefined,
): string | null {
  const effect = entries?.find((e) => e.language.name === "en")?.short_effect;
  return effect ? collapseWhitespace(effect) : null;
}

/** 25 -> #0025 */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

/** Numeric id from a resource URL like ".../pokemon-species/25/". */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

export const MISSING = "—";

/** Alternate forms (Mega Evolutions etc.) have Pokémon ids above 10000. */
export function isFormId(id: number): boolean {
  return id >= 10000;
}
