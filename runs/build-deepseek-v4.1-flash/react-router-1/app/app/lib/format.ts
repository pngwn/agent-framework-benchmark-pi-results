export function humanize(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function englishName(
  entries: Array<{ name?: string; genus?: string; language: { name: string } }> | undefined,
): string | undefined {
  return entries?.find((entry) => entry.language.name === 'en')?.name;
}

export function englishGenus(
  entries: Array<{ genus?: string; language: { name: string } }> | undefined,
): string | undefined {
  return entries?.find((entry) => entry.language.name === 'en')?.genus;
}

export function englishFlavor(
  entries: Array<{ flavor_text: string; language: { name: string } }> | undefined,
): string | undefined {
  if (!entries) return undefined;
  let latest: string | undefined;
  for (const entry of entries) {
    if (entry.language.name === 'en') latest = entry.flavor_text;
  }
  return latest?.replace(/\s+/g, ' ').trim();
}

export function valueOrDash(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

export function idFromUrl(url: string | undefined | null): number {
  if (!url) return NaN;
  return Number(url.match(/\/(\d+)\/?$/)?.[1]);
}
