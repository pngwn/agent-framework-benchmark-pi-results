export function humanize(name) {
  if (!name) return '';
  return String(name)
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function englishName(resource, fallback) {
  const names = resource?.names;
  if (Array.isArray(names)) {
    const entry = names.find((item) => item?.language?.name === 'en');
    if (entry?.name) return entry.name;
  }
  if (fallback !== undefined) return fallback;
  return humanize(resource?.name);
}

export function latestEnglishFlavorText(entries) {
  if (!Array.isArray(entries)) return '';
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.language?.name === 'en' && typeof entry.flavor_text === 'string') {
      return entry.flavor_text.replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

export function englishShortEffect(entries) {
  if (!Array.isArray(entries)) return null;
  const entry = entries.find((item) => item?.language?.name === 'en');
  return entry?.short_effect ?? null;
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function statLabel(name) {
  const labels = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
  };
  return labels[name] ?? humanize(name);
}

export function formatMetric(value, units, divisor = 10) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${(Number(value) / divisor).toFixed(1)} ${units}`;
}

export function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
