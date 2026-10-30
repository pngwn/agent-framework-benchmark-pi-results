export function humanize(name = '') {
  return String(name)
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function englishName(record, fallback = '') {
  const entry = record?.names?.find((n) => n.language?.name === 'en');
  return entry?.name ?? fallback;
}

export function englishGenus(species, fallback = '—') {
  const entry = species?.genera?.find((g) => g.language?.name === 'en');
  return entry?.genus ?? fallback;
}

export function latestEnglishFlavor(entries = []) {
  const english = entries.filter((entry) => entry.language?.name === 'en');
  if (!english.length) return null;
  return String(english[english.length - 1].flavor_text).replace(/\s+/g, ' ').trim();
}

export function shortEffect(record) {
  return record?.effect_entries?.find((entry) => entry.language?.name === 'en')?.short_effect ?? null;
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function idFromUrl(url = '') {
  const match = String(url).match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function valueOrDash(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}
