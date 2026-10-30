export const humanize = (name: string) =>
  name
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const dexNumber = (id: number) => `#${String(id).padStart(4, "0")}`;

export const DASH = "—";

export const show = (value: number | string | null | undefined) => (value == null || value === "" ? DASH : String(value));

export const pageTitle = (heading: string) => `${heading} – Pokédex`;
