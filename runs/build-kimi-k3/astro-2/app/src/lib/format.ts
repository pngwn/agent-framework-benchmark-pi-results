// Formatting helpers implementing the naming rules from the spec.

export const humanize = (name: string): string =>
  name
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');

export const dexNumber = (id: number): string => `#${String(id).padStart(4, '0')}`;

interface NamedEntry {
  name: string;
  language: { name: string };
}

export const englishName = (names: NamedEntry[] | undefined | null): string | undefined =>
  names?.find((n) => n.language.name === 'en')?.name;

interface FlavorEntry {
  flavor_text: string;
  language: { name: string };
}

export const latestEnglishFlavor = (entries: FlavorEntry[] | undefined | null): string | undefined => {
  const en = entries?.filter((e) => e.language.name === 'en');
  if (!en?.length) return undefined;
  return en[en.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
};

export const orDash = (value: number | string | null | undefined): string =>
  value === null || value === undefined ? '—' : String(value);
