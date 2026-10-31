// Small formatting helpers shared by every page.

export function idFromUrl(url) {
  const m = /\/(\d+)\/?$/.exec(url ?? '');
  return m ? Number(m[1]) : null;
}

// "mr-mime" -> "Mr Mime"
export function humanize(name) {
  return String(name ?? '')
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function collapseWhitespace(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

export function englishName(record) {
  return record?.names?.find((n) => n.language?.name === 'en')?.name ?? humanize(record?.name);
}

export function englishGenus(species) {
  return species?.genera?.find((g) => g.language?.name === 'en')?.genus ?? null;
}

export function latestEnglishFlavor(entries) {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  const last = en.at(-1);
  return last ? collapseWhitespace(last.flavor_text) : null;
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}
