export function collapse(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function humanize(name) {
  return String(name ?? '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function englishName(resource, fallback) {
  const match = resource?.names?.find((entry) => entry.language?.name === 'en');
  return match?.name ?? fallback ?? humanize(resource?.name);
}

export function latestEnglishFlavor(entries) {
  const english = (entries ?? []).filter((entry) => entry.language?.name === 'en');
  return collapse(english.at(-1)?.flavor_text ?? '');
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function displayValue(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

export function idFromUrl(url) {
  const match = String(url ?? '').match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function typeToken(name) {
  return String(name ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function setDocumentTitle(heading) {
  document.title = heading === 'Pokémon' ? 'Pokédex' : `${heading} – Pokédex`;
}
