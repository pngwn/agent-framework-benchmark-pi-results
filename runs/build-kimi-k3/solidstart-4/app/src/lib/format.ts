// Humanize an API name: each `-`-separated word capitalized, joined by spaces.
export function humanize(name: string): string {
  return name
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Dex number: `#` plus four zero-padded digits.
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

// English name of a resource with a `names` list, falling back to the humanized API name.
export function enNameOf(resource: any): string {
  const found = resource?.names?.find((n: any) => n?.language?.name === "en")?.name;
  return found ?? humanize(resource?.name ?? "");
}

// Collapse every run of whitespace (including \n and \f) to a single space.
export function collapseWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
