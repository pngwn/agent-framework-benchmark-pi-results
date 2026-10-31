// Data access layer. All data comes from the local PokeAPI server over HTTP at
// request time. Responses are cached in memory for the lifetime of the process.

import { idFromUrl, isAlternateFormId } from './format.js';

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const cache = new Map();

// Fetch a JSON document from the API. `pathOrUrl` may be an absolute URL (as
// found in API responses) or a path like `/api/v2/pokemon/25/`. Returns null
// for 404s.
export function fetchJson(pathOrUrl) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE_URL}${pathOrUrl}`;
  const cached = cache.get(url);
  if (cached !== undefined) return cached;
  const promise = fetch(url, { cache: 'no-store' }).then((res) => {
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API request failed: ${url} -> ${res.status}`);
    return res.json();
  });
  cache.set(url, promise);
  promise.catch(() => cache.delete(url));
  return promise;
}

// Full (unpaginated) results list for a resource: [{ name, url }].
export async function listResource(resource) {
  const data = await fetchJson(`/api/v2/${resource}/?limit=100000`);
  return data?.results ?? [];
}

export const getSpeciesList = () => listResource('pokemon-species');
export const getTypeList = () => listResource('type');
export const getGenerationList = () => listResource('generation');

export const getSpecies = (nameOrId) => fetchJson(`/api/v2/pokemon-species/${encodeURIComponent(String(nameOrId).toLowerCase())}/`);
export const getPokemon = (nameOrId) => fetchJson(`/api/v2/pokemon/${encodeURIComponent(String(nameOrId).toLowerCase())}/`);
export const getMove = (nameOrId) => fetchJson(`/api/v2/move/${encodeURIComponent(String(nameOrId).toLowerCase())}/`);
export const getAbility = (nameOrId) => fetchJson(`/api/v2/ability/${encodeURIComponent(String(nameOrId).toLowerCase())}/`);
export const getType = (nameOrId) => fetchJson(`/api/v2/type/${encodeURIComponent(String(nameOrId).toLowerCase())}/`);
export const getGeneration = (nameOrId) => fetchJson(`/api/v2/generation/${encodeURIComponent(String(nameOrId).toLowerCase())}/`);
export const getVersionGroup = (nameOrId) => fetchJson(`/api/v2/version-group/${encodeURIComponent(String(nameOrId).toLowerCase())}/`);

// The 18 playable types (API order), excluding stellar / unknown / shadow.
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export async function getPlayableTypes() {
  const list = await getTypeList();
  return list.filter((t) => !EXCLUDED_TYPES.has(t.name));
}

export function isPlayableTypeName(name) {
  return !EXCLUDED_TYPES.has(name);
}

// Turn a list of Pokémon references into card data, mapping each Pokémon to
// its species, dropping alternate forms and duplicates, ordered by dex number.
// `refs` items: { url, name } or { ref: {url,name}, hidden: boolean }.
export async function pokemonCardsFromRefs(refs) {
  const bySpecies = new Map();
  await Promise.all(
    refs.map(async (item) => {
      const ref = item.ref ?? item;
      const hidden = Boolean(item.hidden);
      const pokemonId = idFromUrl(ref.url);
      if (pokemonId == null || isAlternateFormId(pokemonId)) return;
      const pokemon = await getPokemon(pokemonId);
      if (!pokemon?.species?.url) return;
      const speciesId = idFromUrl(pokemon.species.url);
      if (speciesId == null) return;
      const existing = bySpecies.get(speciesId);
      bySpecies.set(speciesId, {
        id: speciesId,
        name: pokemon.species.name,
        sprite: pokemon.sprites?.front_default ?? `${API_BASE_URL}/media/sprites/pokemon/${pokemonId}.png`,
        hidden: Boolean(existing?.hidden || hidden),
      });
    }),
  );
  return [...bySpecies.values()].sort((a, b) => a.id - b.id);
}
