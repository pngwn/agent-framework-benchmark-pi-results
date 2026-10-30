const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');
const API_ROOT = `${API_BASE_URL}/api/v2`;
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

const cache = new Map();
const pending = new Map();

export { API_BASE_URL };

export const idFromUrl = (url) => {
  const match = String(url ?? '').match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
};

export const humanize = (name = '') =>
  String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');

export const formatDex = (id) => `#${String(id).padStart(4, '0')}`;

export const formatValue = (value) => (value === null || value === undefined ? '—' : String(value));

export const englishName = (resource, fallbackName = resource?.name) =>
  resource?.names?.find((item) => item.language?.name === 'en')?.name ?? humanize(fallbackName ?? '');

export function englishGenus(species) {
  return species?.genera?.find((item) => item.language?.name === 'en')?.genus ?? '';
}

export function latestEnglishFlavorText(resource) {
  const entries = resource?.flavor_text_entries ?? [];
  const last = [...entries].reverse().find((item) => item.language?.name === 'en');
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export function englishShortEffect(resource) {
  return resource?.effect_entries?.find((item) => item.language?.name === 'en')?.short_effect ?? null;
}

export function englishEffect(resource) {
  return resource?.effect_entries?.find((item) => item.language?.name === 'en')?.effect ?? null;
}

export const spriteUrl = (id) => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;

async function fetchJson(url) {
  if (cache.has(url)) return cache.get(url);
  if (pending.has(url)) return pending.get(url);

  const request = (async () => {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (response.status === 404) {
      cache.set(url, null);
      return null;
    }
    if (!response.ok) {
      throw new Error(`API request failed (${response.status} ${response.statusText}): ${url}`);
    }
    const data = await response.json();
    cache.set(url, data);
    return data;
  })();

  pending.set(url, request);
  try {
    return await request;
  } catch (error) {
    cache.delete(url);
    throw error;
  } finally {
    pending.delete(url);
  }
}

export function apiGet(path) {
  if (/^https?:\/\//i.test(path)) return fetchJson(path);
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return fetchJson(`${API_ROOT}${suffix}`);
}

const apiGetUrl = (url) => (url ? fetchJson(url) : Promise.resolve(null));

function memoize(loader) {
  let promise;
  return () => {
    if (!promise) {
      promise = loader().catch((error) => {
        promise = undefined;
        throw error;
      });
    }
    return promise;
  };
}

const loadSpeciesCatalog = async () => {
  const data = await apiGet('/pokemon-species/?limit=100000');
  const list = (data?.results ?? [])
    .map((entry) => ({ name: entry.name, id: idFromUrl(entry.url) }))
    .filter((entry) => Number.isFinite(entry.id))
    .sort((a, b) => a.id - b.id);
  return { list, byId: new Map(list.map((entry) => [entry.id, entry])) };
};

export const getSpeciesCatalog = memoize(loadSpeciesCatalog);

const loadTypeCatalog = async () => {
  const index = await apiGet('/type/?limit=100');
  const results = (index?.results ?? []).filter((entry) => !EXCLUDED_TYPES.has(entry.name));
  const details = await Promise.all(
    results.map(async (entry) => ({ indexName: entry.name, data: await apiGetUrl(entry.url) })),
  );

  const types = [];
  const byName = new Map();
  const byPokemon = new Map();

  for (const { indexName, data } of details) {
    if (!data) continue;
    const type = {
      name: data.name ?? indexName,
      id: data.id,
      display: englishName(data, data.name ?? indexName),
      data,
    };
    types.push(type);
    byName.set(type.name, type);

    for (const entry of data.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon?.url);
      if (!id || id > 10000) continue;
      const slots = byPokemon.get(id) ?? [];
      slots.push({ name: type.name, slot: entry.slot ?? 1 });
      byPokemon.set(id, slots);
    }
  }

  for (const slots of byPokemon.values()) slots.sort((a, b) => a.slot - b.slot);
  return { types, byName, byPokemon };
};

export const getTypeCatalog = memoize(loadTypeCatalog);

const loadGenerationCatalog = async () => {
  const index = await apiGet('/generation/?limit=100');
  const results = index?.results ?? [];
  const details = await Promise.all(results.map((entry) => apiGetUrl(entry.url)));
  return details
    .filter(Boolean)
    .map((data, position) => ({
      name: data.name,
      id: data.id,
      display: englishName(data, data.name),
      position,
      species: new Set(
        (data.pokemon_species ?? []).map((entry) => idFromUrl(entry.url)).filter((id) => Number.isFinite(id)),
      ),
    }))
    .sort((a, b) => a.position - b.position);
};

export const getGenerationCatalog = memoize(loadGenerationCatalog);

export const getSpecies = (name) => apiGet(`/pokemon-species/${encodeURIComponent(name)}/`);
export const getPokemon = (name) => apiGet(`/pokemon/${encodeURIComponent(name)}/`);
export const getMove = (name) => apiGet(`/move/${encodeURIComponent(name)}/`);
export const getAbility = (name) => apiGet(`/ability/${encodeURIComponent(name)}/`);

export async function getDefaultPokemon(species) {
  const variety = species?.varieties?.find((entry) => entry.is_default)?.pokemon;
  if (variety?.name) return getPokemon(variety.name);
  if (species?.id) return getPokemon(String(species.id));
  return null;
}

export const getEvolutionChain = (url) => apiGetUrl(url);

const versionGroupCache = new Map();
export function getVersionGroup(name) {
  if (!versionGroupCache.has(name)) {
    versionGroupCache.set(name, apiGet(`/version-group/${encodeURIComponent(name)}/`));
  }
  return versionGroupCache.get(name);
}

export function pokemonTypes(pokemon) {
  return [...(pokemon?.types ?? [])].sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)).map((entry) => entry.type.name);
}

export function typeDisplayName(typeName, typeCatalog) {
  return typeCatalog?.byName?.get(typeName)?.display ?? humanize(typeName);
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
