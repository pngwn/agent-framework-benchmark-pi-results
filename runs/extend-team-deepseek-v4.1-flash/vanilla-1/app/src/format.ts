export interface Named {
  name: string;
  language: { name: string };
}

export const EM_DASH = '—';

/** `mr-mime` → `Mr Mime`. */
export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function englishName(resource: { name: string; names?: Named[] }): string {
  return resource.names?.find((n) => n.language.name === 'en')?.name ?? humanize(resource.name);
}

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

export const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();

export function latestEnglishFlavorText(entries: { flavor_text: string; language: { name: string } }[] | undefined): string | null {
  const en = (entries ?? []).filter((e) => e.language.name === 'en');
  return en.length ? collapse(en[en.length - 1].flavor_text) : null;
}

export function englishShortEffect(entries: { short_effect?: string; language: { name: string } }[] | undefined): string | null {
  const entry = (entries ?? []).find((e) => e.language.name === 'en' && e.short_effect);
  return entry?.short_effect ? collapse(entry.short_effect) : null;
}

export const orDash = (value: number | string | null | undefined) => (value === null || value === undefined ? EM_DASH : String(value));

export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}
