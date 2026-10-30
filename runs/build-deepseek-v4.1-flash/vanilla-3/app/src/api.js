const API_BASE = (globalThis.__API_BASE__ || 'http://localhost:9000').replace(/\/+$/, '');
const API_PREFIX = '/api/v2';

const cache = new Map();

export class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} for ${url}`);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

export function apiBase() {
  return API_BASE;
}

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function parseId(url) {
  const match = String(url ?? '').match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function humanize(name) {
  return String(name ?? '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function englishName(record) {
  const entry = record?.names?.find((item) => item.language?.name === 'en');
  return entry?.name ?? humanize(record?.name);
}

export function englishGenus(species) {
  return species?.genera?.find((item) => item.language?.name === 'en')?.genus ?? '';
}

export function collapseWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function latestEnglishFlavor(record) {
  const entries = record?.flavor_text_entries ?? [];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].language?.name === 'en') {
      return collapseWhitespace(entries[i].flavor_text);
    }
  }
  return null;
}

export function englishShortEffect(record) {
  return record?.effect_entries?.find((item) => item.language?.name === 'en')?.short_effect ?? null;
}

export function formatDex(id) {
  return `#${String(id).padStart(4, '0')}`;
}

export function dash(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

export function spriteUrl(id) {
  return `${API_BASE}/media/sprites/pokemon/${id}.png`;
}

async function requestJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new HttpError(response.status, url);
  return response.json();
}

export function fetchJson(pathOrUrl) {
  const url = apiUrl(pathOrUrl);
  if (!cache.has(url)) {
    const pending = requestJson(url).catch((error) => {
      cache.delete(url);
      throw error;
    });
    cache.set(url, pending);
  }
  return cache.get(url);
}

export function fetchResource(name, idOrName) {
  if (idOrName === undefined || idOrName === null || idOrName === '') {
    return fetchJson(`${API_PREFIX}/${name}/?limit=100000`);
  }
  return fetchJson(`${API_PREFIX}/${name}/${encodeURIComponent(idOrName)}/`);
}

export const getSpeciesList = () =>
  fetchResource('pokemon-species').then((data) =>
    (data.results ?? [])
      .map((item) => ({ name: item.name, id: parseId(item.url), url: item.url }))
      .filter((item) => item.id !== null)
      .sort((a, b) => a.id - b.id),
  );

let speciesMapsPromise;
export function getSpeciesMaps() {
  if (!speciesMapsPromise) {
    speciesMapsPromise = getSpeciesList().then((list) => ({
      list,
      byId: new Map(list.map((item) => [item.id, item])),
      byName: new Map(list.map((item) => [item.name, item])),
    }));
  }
  return speciesMapsPromise;
}

export const getTypeIndex = () =>
  fetchResource('type').then((data) =>
    (data.results ?? [])
      .filter((item) => !['stellar', 'unknown', 'shadow'].includes(item.name))
      .map((item) => ({ name: item.name, id: parseId(item.url), url: item.url })),
  );

export const getType = (name) => fetchResource('type', name);

let allTypesPromise;
export function getAllTypes() {
  if (!allTypesPromise) {
    allTypesPromise = getTypeIndex().then((types) =>
      Promise.all(types.map((item) => getType(item.name))),
    );
  }
  return allTypesPromise;
}

export const getGenerationIndex = () =>
  fetchResource('generation').then((data) =>
    (data.results ?? []).map((item) => ({
      name: item.name,
      id: parseId(item.url),
      url: item.url,
    })),
  );

export const getGeneration = (name) => fetchResource('generation', name);

let allGenerationsPromise;
export function getAllGenerations() {
  if (!allGenerationsPromise) {
    allGenerationsPromise = getGenerationIndex().then((generations) =>
      Promise.all(generations.map((item) => getGeneration(item.name))),
    );
  }
  return allGenerationsPromise;
}

export const getPokemonById = (id) => fetchResource('pokemon', id);
export const getSpecies = (idOrName) => fetchResource('pokemon-species', idOrName);
export const getMove = (name) => fetchResource('move', name);
export const getAbility = (name) => fetchResource('ability', name);
export const getVersionGroup = (name) => fetchResource('version-group', name);

export function getEvolutionChain(url) {
  return fetchJson(url);
}

export function typeLabelFromRef(typeRef) {
  if (!typeRef) return '—';
  return humanize(typeRef.name);
}

export function speciesCardInfo(pokemonRef, maps) {
  const id = parseId(pokemonRef?.url);
  const species = id !== null ? maps.byId.get(id) : null;
  if (species) {
    return { id: species.id, slug: species.name, label: humanize(species.name) };
  }
  return {
    id: id ?? 0,
    slug: pokemonRef?.name ?? '',
    label: humanize(pokemonRef?.name ?? ''),
  };
}

export async function hydrateSprites(ids, root, selector = 'img[data-sprite-id]') {
  const unique = [...new Set(ids)].filter((id) => Number.isFinite(id) && id > 0);
  if (!unique.length) return;
  let index = 0;
  const worker = async () => {
    while (index < unique.length) {
      const id = unique[index];
      index += 1;
      try {
        const pokemon = await getPokemonById(id);
        const source =
          pokemon?.sprites?.front_default ??
          pokemon?.sprites?.other?.['official-artwork']?.front_default;
        if (!source) continue;
        const absolute = apiUrl(source);
        for (const image of root.querySelectorAll(`${selector}[data-sprite-id="${id}"]`)) {
          if (image.getAttribute('src') !== absolute) image.setAttribute('src', absolute);
        }
      } catch {
        // The constructed media URL remains as a useful fallback.
      }
    }
  };
  const workers = Array.from({ length: Math.min(10, unique.length) }, worker);
  await Promise.all(workers);
}
