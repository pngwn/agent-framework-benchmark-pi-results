// Shared helpers for interpreting PokeAPI data.

/** Extract the numeric id from a resource URL like "/api/v2/pokemon/25/". */
export function idFromUrl(url) {
  const match = /\/(\d+)\/?$/.exec(url ?? '');
  return match ? Number(match[1]) : NaN;
}

/** "mr-mime" -> "Mr Mime" */
export function humanize(name) {
  return (name ?? '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** The English entry from a `names` array, falling back to the humanized API name. */
export function englishName(record) {
  const entry = record?.names?.find((n) => n.language?.name === 'en');
  return entry?.name ?? humanize(record?.name);
}

/** The English genus of a species ("Mouse Pokémon"). */
export function englishGenus(species) {
  return species?.genera?.find((g) => g.language?.name === 'en')?.genus ?? '';
}

/** The last English flavor text entry, with all whitespace runs collapsed. */
export function latestEnglishFlavor(entries) {
  const english = (entries ?? []).filter((e) => e.language?.name === 'en');
  const last = english.at(-1);
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : '';
}

/** "#0025" */
export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}
