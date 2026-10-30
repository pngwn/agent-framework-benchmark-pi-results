export const EM_DASH = '—';

export function humanize(name = '') {
  return String(name)
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatDex(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function displayValue(value) {
  if (value === null || value === undefined || value === '') return EM_DASH;
  return String(value);
}

export function latestEnglishFlavor(entries = []) {
  const english = entries.filter((entry) => entry.language?.name === 'en');
  const last = english[english.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export function englishName(record, fallback = '') {
  const names = record?.names ?? [];
  return names.find((entry) => entry.language?.name === 'en')?.name ?? (fallback || humanize(record?.name ?? ''));
}

export function englishGenus(record) {
  const genera = record?.genera ?? [];
  return genera.find((entry) => entry.language?.name === 'en')?.genus ?? '';
}

export function englishShortEffect(record) {
  const entries = record?.effect_entries ?? [];
  const text = entries.find((entry) => entry.language?.name === 'en')?.short_effect;
  return typeof text === 'string' && text.trim() ? text : null;
}
