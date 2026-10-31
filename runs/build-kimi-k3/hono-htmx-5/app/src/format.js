// Display formatting helpers.

// 'mr-mime' -> 'Mr Mime', 'thunder-punch' -> 'Thunder Punch'
export const humanize = (name) =>
  String(name)
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

// 25 -> '#0025'
export const dexNumber = (id) => `#${String(id).padStart(4, '0')}`;

export const collapseWhitespace = (s) => String(s).replace(/\s+/g, ' ').trim();

// English display name of a resource that has a `names` array.
export const englishName = (resource) =>
  resource.names?.find((n) => n.language.name === 'en')?.name ?? humanize(resource.name);

export const englishGenus = (species) =>
  species.genera?.find((g) => g.language.name === 'en')?.genus ?? '';

// Last English flavor text, whitespace collapsed.
export const latestEnglishFlavor = (entries) => {
  const en = (entries ?? []).filter((e) => e.language.name === 'en');
  return en.length ? collapseWhitespace(en[en.length - 1].flavor_text) : null;
};

export const MISSING = '—'; // em dash for missing values
export const orMissing = (v) => (v == null ? MISSING : String(v));

export const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
export const statLabel = (name) => STAT_LABELS[name] ?? humanize(name);
