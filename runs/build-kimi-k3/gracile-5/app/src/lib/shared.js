// Pure helpers shared between the server routes and the browser scripts.
// Nothing in here may touch Node APIs or `process.env`.

export const PAGE_SIZE = 48;

/** `mr-mime` → `Mr Mime`, `thunder-punch` → `Thunder Punch`. */
export function humanize(apiName) {
  return String(apiName)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** `25` → `#0025`. */
export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/**
 * Home page filtering: case-insensitive substring search on the humanized
 * name, plus type (either slot) and generation matches.
 */
export function filterSpecies(speciesIndex, { q, type, generation }) {
  const query = (q ?? '').trim().toLowerCase();
  return speciesIndex.filter((species) => {
    if (query && !humanize(species.name).toLowerCase().includes(query)) return false;
    if (type && !(species.types ?? []).includes(type)) return false;
    if (generation && species.generation !== generation) return false;
    return true;
  });
}

export function paginate(items, page) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    current,
    totalPages,
    pageItems: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
  };
}

/** Builds `/?q=…&type=…&generation=…&page=…`, omitting empty/default params. */
export function homePageUrl({ q, type, generation, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

/** HTML string for a Pokémon card (used by the browser-side re-rendering). */
export function cardHTML(species, typeEn, apiBaseUrl) {
  const badges = (species.types ?? [])
    .map((type) => `<span class="badge type-${escapeHTML(type)}">${escapeHTML(typeEn[type] ?? humanize(type))}</span>`)
    .join('');
  return (
    `<li class="card"><a href="/pokemon/${encodeURIComponent(species.name)}">` +
    `<img src="${apiBaseUrl}/media/sprites/pokemon/${species.id}.png" alt="" width="96" height="96" loading="lazy">` +
    `<span class="dex">${dexNumber(species.id)}</span>` +
    `<span class="name">${escapeHTML(humanize(species.name))}</span>` +
    (badges ? `<span class="badges">${badges}</span>` : '') +
    `</a></li>`
  );
}
