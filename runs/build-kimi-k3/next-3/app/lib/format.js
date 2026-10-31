// Formatting helpers shared by all pages.

/** Humanize an API name: 'mr-mime' -> 'Mr Mime', 'thunder-punch' -> 'Thunder Punch'. */
export function humanize(name) {
  if (!name) return '';
  return name
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** The English name from a record's `names` list, falling back to the humanized API name. */
export function englishName(record) {
  const entry = record?.names?.find((n) => n.language?.name === 'en');
  return entry?.name ?? humanize(record?.name ?? '');
}

/** Extract the numeric id from a resource URL. */
export function idFromUrl(url) {
  const match = /\/(\d+)\/?$/.exec(url ?? '');
  return match ? Number(match[1]) : null;
}

/** Dex number: 25 -> '#0025'. */
export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

/** Collapse every run of whitespace (including \n and \f) to a single space. */
export function collapseWhitespace(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/** The latest English flavor text of a species or move record. */
export function latestEnglishFlavor(record) {
  const entries = (record?.flavor_text_entries ?? []).filter((e) => e.language?.name === 'en');
  const last = entries[entries.length - 1];
  return last ? collapseWhitespace(last.flavor_text) : null;
}

/** The English short effect of a move or ability, with $effect_chance substituted. */
export function englishShortEffect(record) {
  const entry = (record?.effect_entries ?? []).find((e) => e.language?.name === 'en');
  if (!entry?.short_effect) return null;
  let text = entry.short_effect;
  const chance = record?.effect_chance;
  if (chance != null) text = text.replaceAll('$effect_chance', String(chance));
  return collapseWhitespace(text);
}

/** The English genus of a species record ('Mouse Pokémon'). */
export function englishGenus(species) {
  const entry = (species?.genera ?? []).find((g) => g.language?.name === 'en');
  return entry?.genus ?? null;
}

export const MISSING = '—';
