// Formatting helpers shared by all pages.

export const MISSING = '—'; // em dash for missing values

// `mr-mime` -> `Mr Mime`, `thunder-punch` -> `Thunder Punch`
export function humanize(name) {
  return String(name ?? '')
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

// English name from a `names` array, falling back to the humanized API name.
export function enName(names, fallback) {
  const entry = (names ?? []).find((n) => n.language?.name === 'en');
  return entry?.name ?? humanize(fallback ?? '');
}

// English genus ("Mouse Pokémon") from a `genera` array.
export function enGenus(genera) {
  return (genera ?? []).find((g) => g.language?.name === 'en')?.genus ?? '';
}

// The last English flavor text entry, whitespace collapsed to single spaces.
export function latestEnFlavor(entries) {
  const list = (entries ?? []).filter((e) => e.language?.name === 'en');
  if (!list.length) return null;
  return list[list.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
}

// The English short_effect from an `effect_entries` array.
export function enEffect(entries) {
  const list = (entries ?? []).filter((e) => e.language?.name === 'en');
  if (!list.length) return null;
  return list[list.length - 1].short_effect.replace(/\s+/g, ' ').trim();
}

// `#0025`
export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}
