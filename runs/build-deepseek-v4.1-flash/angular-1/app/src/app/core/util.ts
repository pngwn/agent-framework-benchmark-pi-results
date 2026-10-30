export function humanize(name: string): string {
  return name
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function englishName(
  entries: { name: string; language: { name: string } }[] | undefined,
  fallback: string,
): string {
  return entries?.find((entry) => entry.language.name === 'en')?.name ?? humanize(fallback);
}

export function latestFlavorText(
  entries: { flavor_text: string; language: { name: string } }[] | undefined,
): string | null {
  if (!entries) return null;
  const english = entries.filter((entry) => entry.language.name === 'en');
  if (english.length === 0) return null;
  return english[english.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function idFromUrl(url: string | null | undefined): number | null {
  if (!url) return null;
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function isAlternateForm(id: number): boolean {
  return id >= 10000;
}

export function numberOrDash(value: number | null | undefined): string {
  return value == null ? '—' : String(value);
}

export function metres(decimetres: number): string {
  return `${(decimetres / 10).toFixed(1)} m`;
}

export function kilograms(hectograms: number): string {
  return `${(hectograms / 10).toFixed(1)} kg`;
}

export function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'en', { sensitivity: 'base' });
}

export function parsePage(value: string | null | undefined): number {
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}
