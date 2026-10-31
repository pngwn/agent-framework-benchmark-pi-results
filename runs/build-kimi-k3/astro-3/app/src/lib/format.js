export function humanize(name) {
  return (name ?? '')
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function englishName(names) {
  return names?.find((n) => n.language?.name === 'en')?.name ?? null;
}

export function collapseWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

export function latestEnglishFlavor(entries) {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  if (!en.length) return null;
  return collapseWhitespace(en[en.length - 1].flavor_text);
}

export function idFromUrl(url) {
  const m = /\/(\d+)\/$/.exec(url ?? '');
  return m ? Number(m[1]) : null;
}

export const EM_DASH = '\u2014';

export function orDash(value) {
  return value === null || value === undefined ? EM_DASH : String(value);
}
