export const EM_DASH = '—';

export function humanize(value) {
  return String(value ?? '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function englishOrHumanized(resource) {
  const english = resource?.names?.find((entry) => entry.language?.name === 'en');
  return english?.name ?? humanize(resource?.name);
}

export function englishGenus(species) {
  const genus = species?.genera?.find((entry) => entry.language?.name === 'en');
  return genus?.genus ?? null;
}

export function latestEnglishFlavorText(entries) {
  const latest = (entries ?? []).filter((entry) => entry.language?.name === 'en').at(-1);
  return latest ? String(latest.flavor_text).replace(/\s+/g, ' ').trim() : null;
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function typeLabel(typeOrName) {
  if (typeof typeOrName === 'string') return humanize(typeOrName);
  return englishOrHumanized(typeOrName);
}

export function statLabel(statName) {
  const labels = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
  };
  return labels[statName] ?? humanize(statName);
}

export function methodLabel(methodName) {
  return humanize(methodName);
}

export function displayValue(value) {
  return value === null || value === undefined || value === '' ? EM_DASH : String(value);
}

export function heightInMetres(decimetres) {
  return `${(Number(decimetres) / 10).toFixed(1)} m`;
}

export function weightInKilograms(hectograms) {
  return `${(Number(hectograms) / 10).toFixed(1)} kg`;
}

export function capitalize(value) {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}
