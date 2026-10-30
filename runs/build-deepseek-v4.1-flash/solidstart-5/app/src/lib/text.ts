export const humanize = (name: string): string =>
  String(name || "")
    .split("-")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
