export const humanize = (name: string): string =>
  name
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");

export const dexNumber = (id: number): string => `#${String(id).padStart(4, "0")}`;

export const collapseWhitespace = (s: string): string => s.replace(/\s+/g, " ").trim();

export const emDash = (v: number | null | undefined): string =>
  v === null || v === undefined ? "—" : String(v);

export const latestEnglishFlavor = (
  entries: { flavor_text: string; language: { name: string } }[] | undefined | null,
): string | null => {
  const en = entries?.filter((e) => e.language.name === "en");
  return en && en.length ? collapseWhitespace(en[en.length - 1].flavor_text) : null;
};

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

export const statLabel = (name: string): string => STAT_LABELS[name] ?? humanize(name);

export const one = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;
