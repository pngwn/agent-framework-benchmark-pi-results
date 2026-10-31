// Shared helpers (safe to use on both server and client).

export function humanize(name) {
  if (!name) return "";
  return name
    .split("-")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function englishName(names) {
  if (!Array.isArray(names)) return null;
  const entry = names.find((n) => n.language?.name === "en");
  return entry?.name ?? null;
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, "0")}`;
}

export function collapseWhitespace(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

// Latest English flavor text: the last English entry, whitespace collapsed.
export function latestEnglishFlavor(entries) {
  if (!Array.isArray(entries)) return null;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].language?.name === "en") return collapseWhitespace(entries[i].flavor_text);
  }
  return null;
}

// Numeric id from a resource URL like ".../api/v2/pokemon/25/".
export function idFromUrl(url) {
  const match = /\/(\d+)\/?$/.exec(url ?? "");
  return match ? Number(match[1]) : null;
}

export const ALT_FORM_CUTOFF = 10000;

export function isAlternateForm(id) {
  return id != null && id > ALT_FORM_CUTOFF;
}

export const EM_DASH = "—";
