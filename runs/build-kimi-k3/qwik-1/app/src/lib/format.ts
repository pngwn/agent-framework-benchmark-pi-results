/** Humanize an API name: `mr-mime` -> `Mr Mime`. */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Collapse every run of whitespace (including \n and \f) to a single space. */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

interface LocalizedName {
  name: string;
  language: { name: string };
}

/** The English entry of a `names` list, or null. */
export function englishName(names: LocalizedName[] | undefined | null): string | null {
  return names?.find((n) => n.language?.name === 'en')?.name ?? null;
}

/** Dex number: 25 -> `#0025`. */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export const EM_DASH = '—';
