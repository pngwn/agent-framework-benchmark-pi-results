// Server-side PokeAPI client with in-memory caching.
import { idFromUrl } from './shared/format.js';

export const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');
export const MEDIA_BASE = API_BASE;

const cache = new Map();

// Fetch a single API resource. `pathOrUrl` is an API path ("/pokemon/pikachu")
// or a full URL from another response. Returns null on 404.
export function api(pathOrUrl) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE}/api/v2${pathOrUrl}`;
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then(async (res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`API ${url} responded ${res.status}`);
        return res.json();
      }),
    );
    // Don't cache rejected promises forever.
    cache.get(url).catch(() => cache.delete(url));
  }
  return cache.get(url);
}

// Full (unpaginated) list for a resource.
export function apiList(resource) {
  return api(`/${resource}/?limit=100000`).then((page) => page.results);
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let globalsPromise = null;

// Everything the app needs that spans resources: species index, the 18 types
// (with a pokemon-id -> types map), generations and version-group orders.
export function globals() {
  if (!globalsPromise) globalsPromise = loadGlobals().catch((err) => { globalsPromise = null; throw err; });
  return globalsPromise;
}

async function loadGlobals() {
  const [speciesResults, typeResults, generationResults, versionGroupResults] = await Promise.all([
    apiList('pokemon-species'),
    apiList('type'),
    apiList('generation'),
    apiList('version-group'),
  ]);

  const species = speciesResults
    .map((s) => ({ id: idFromUrl(s.url), name: s.name }))
    .sort((a, b) => a.id - b.id);
  const speciesNameById = new Map(species.map((s) => [s.id, s.name]));

  const typeRefs = typeResults.filter((t) => !EXCLUDED_TYPES.has(t.name));
  const [typeRecords, generationRecords, versionGroupRecords] = await Promise.all([
    Promise.all(typeRefs.map((t) => api(`/type/${t.name}`))),
    Promise.all(generationResults.map((g) => api(`/generation/${g.name}`))),
    Promise.all(versionGroupResults.map((v) => api(`/version-group/${v.name}`))),
  ]);

  const types = typeRecords.map((rec) => ({
    name: rec.name,
    en: rec.names?.find((n) => n.language?.name === 'en')?.name ?? rec.name,
  }));
  const typeEn = Object.fromEntries(types.map((t) => [t.name, t.en]));

  // pokemon id -> [{ slot, name }] from the type records.
  const typesByPokemonId = new Map();
  for (const rec of typeRecords) {
    for (const entry of rec.pokemon ?? []) {
      const pid = idFromUrl(entry.pokemon.url);
      if (!Number.isFinite(pid) || pid >= 10000) continue;
      if (!typesByPokemonId.has(pid)) typesByPokemonId.set(pid, []);
      typesByPokemonId.get(pid).push({ slot: entry.slot, name: rec.name });
    }
  }
  for (const list of typesByPokemonId.values()) list.sort((a, b) => a.slot - b.slot);

  const generations = generationRecords.map((rec) => ({
    name: rec.name,
    en: rec.names?.find((n) => n.language?.name === 'en')?.name ?? rec.name,
  }));
  const generationBySpecies = new Map();
  for (const rec of generationRecords) {
    for (const s of rec.pokemon_species ?? []) generationBySpecies.set(s.name, rec.name);
  }

  const versionGroupOrder = new Map(versionGroupRecords.map((rec) => [rec.name, rec.order]));

  return { species, speciesNameById, types, typeEn, typesByPokemonId, generations, generationBySpecies, versionGroupOrder };
}

// Map a list of Pokémon references (from move/ability/type records) to unique
// species, excluding alternate forms, sorted by dex number.
export function toSpecies(pokemonRefs, speciesNameById) {
  const byId = new Map();
  for (const ref of pokemonRefs) {
    const id = idFromUrl(ref.pokemon?.url ?? ref.url);
    if (!Number.isFinite(id) || id >= 10000) continue;
    if (!byId.has(id)) {
      byId.set(id, { id, name: speciesNameById.get(id) ?? (ref.pokemon?.name ?? ref.name) });
    }
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
