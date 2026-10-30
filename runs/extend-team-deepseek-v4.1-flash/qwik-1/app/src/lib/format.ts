// Pure helpers shared by server and client code.

export const DASH = "—";

export const humanize = (name: string) =>
  name
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const dexNumber = (id: number) => `#${String(id).padStart(4, "0")}`;

export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);

interface Named {
  name: string;
  language: { name: string };
}

export const englishName = (names: Named[] | undefined, fallback: string) =>
  names?.find((n) => n.language.name === "en")?.name ?? humanize(fallback);

export const cleanText = (text: string) => text.replace(/\s+/g, " ").trim();

export function latestFlavorText(entries: { flavor_text: string; language: { name: string } }[] | undefined) {
  const en = (entries ?? []).filter((e) => e.language.name === "en");
  return en.length ? cleanText(en[en.length - 1].flavor_text) : null;
}

export function shortEffect(entries: { short_effect: string; language: { name: string } }[] | undefined) {
  const entry = (entries ?? []).find((e) => e.language.name === "en");
  return entry ? cleanText(entry.short_effect) : null;
}

export const orDash = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === "" ? DASH : String(value);

export const pageTitle = (h1: string) => `${h1} – Pokédex`;
