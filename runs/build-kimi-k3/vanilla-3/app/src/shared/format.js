// Small formatting helpers shared by the server renderer and the client bundle.

export const humanize = (name) =>
  String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');

export const dexNumber = (id) => `#${String(id).padStart(4, '0')}`;

export const enName = (resource) =>
  resource?.names?.find((n) => n.language?.name === 'en')?.name ?? humanize(resource?.name ?? '');

export const enGenus = (species) =>
  species?.genera?.find((g) => g.language?.name === 'en')?.genus ?? '';

// Latest English flavor text, with all whitespace runs collapsed to single spaces.
export const latestEnFlavor = (entries) => {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  if (!en.length) return null;
  return en[en.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
};

export const enShortEffect = (entries) =>
  (entries ?? []).find((e) => e.language?.name === 'en')?.short_effect?.replace(/\s+/g, ' ').trim() ?? null;

export const missing = (value) => (value === null || value === undefined ? '—' : String(value));

export const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
