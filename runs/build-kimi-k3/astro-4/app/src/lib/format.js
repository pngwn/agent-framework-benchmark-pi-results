// Formatting helpers shared by every page.

// "mr-mime" -> "Mr Mime"
export const humanize = (name) =>
  String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');

// 25 -> "#0025"
export const dexNumber = (id) => `#${String(id).padStart(4, '0')}`;

// English entry of a `names` array, with a humanized fallback.
export const enName = (names, fallback) =>
  names?.find((n) => n.language?.name === 'en')?.name ?? humanize(fallback);

// Latest English flavor text, with whitespace runs collapsed.
export function latestEnFlavor(entries) {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  if (!en.length) return null;
  return en[en.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
}

// ".../pokemon-species/25/" -> 25
export const idFromUrl = (url) => Number(String(url).match(/\/(\d+)\/?$/)[1]);
