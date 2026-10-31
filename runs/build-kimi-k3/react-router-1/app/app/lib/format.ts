// Pure formatting helpers shared by server and client code.

/** Humanize an API name: "mr-mime" -> "Mr Mime". */
export function humanize(name: string): string {
  return name
    .split("-")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** Dex number: 25 -> "#0025". */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

/** English name from a record's `names` list, falling back to the humanized API name. */
export function englishName(record: any): string {
  const entry = record?.names?.find((n: any) => n?.language?.name === "en");
  return entry?.name ?? humanize(record?.name ?? "");
}

/** Latest English flavor text with all whitespace runs collapsed to single spaces. */
export function latestEnglishFlavor(entries: any[] | undefined | null): string | null {
  if (!Array.isArray(entries)) return null;
  const en = entries.filter((e) => e?.language?.name === "en");
  const last = en[en.length - 1];
  if (!last) return null;
  const text = String(last.flavor_text ?? last.text ?? "").replace(/\s+/g, " ").trim();
  return text || null;
}

export const EM_DASH = "—";
