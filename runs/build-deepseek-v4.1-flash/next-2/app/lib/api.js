import {
  EXCLUDED_TYPES,
  englishName,
  idFromUrl,
} from './format';

function apiBase() {
  return (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');
}

export function mediaUrl(path) {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  return `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function spriteUrlForId(id) {
  return `${apiBase()}/media/sprites/pokemon/${id}.png`;
}

export function resourcePath(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url, apiBase());
    return parsed.pathname.replace(/^\/api\/v2\//, '') + parsed.search;
  } catch {
    return null;
  }
}

const promiseCache = new Map();

async function requestJson(path) {
  const url = /^https?:\/\//.test(path) ? path : `${apiBase()}/api/v2/${path}`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`PokeAPI request failed (${response.status}): ${url}`);
  }
  return response.json();
}

export function api(path) {
  const key = path.startsWith('http') ? path : `${apiBase()}|${path}`;
  const existing = promiseCache.get(key);
  if (existing) return existing;
  const promise = requestJson(path).catch((error) => {
    promiseCache.delete(key);
    throw error;
  });
  promiseCache.set(key, promise);
  return promise;
}

export async function mapLimit(items, limit, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

let speciesListPromise;
let speciesByIdPromise;

export function getSpeciesList() {
  if (!speciesListPromise) {
    speciesListPromise = api('pokemon-species/?limit=100000')
      .then((data) => {
        const list = (data?.results ?? [])
          .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name }))
          .filter((entry) => Number.isFinite(entry.id))
          .sort((a, b) => a.id - b.id);
        return list;
      })
      .catch((error) => {
        speciesListPromise = undefined;
        throw error;
      });
  }
  return speciesListPromise;
}

export async function getSpeciesById() {
  if (!speciesByIdPromise) {
    speciesByIdPromise = getSpeciesList()
      .then((list) => new Map(list.map((species) => [species.id, species])))
      .catch((error) => {
        speciesByIdPromise = undefined;
        throw error;
      });
  }
  return speciesByIdPromise;
}

export async function getSpecies(name) {
  return api(`pokemon-species/${encodeURIComponent(name)}`);
}

export async function getSpeciesRefById(id) {
  const byId = await getSpeciesById();
  const known = byId.get(Number(id));
  if (known) return known;
  const species = await api(`pokemon-species/${id}`);
  if (!species) return null;
  const entry = { id: species.id, name: species.name };
  byId.set(entry.id, entry);
  return entry;
}

export async function getDefaultPokemon(speciesId) {
  return api(`pokemon/${speciesId}`);
}

let typesPromise;

export function getTypes() {
  if (!typesPromise) {
    typesPromise = api('type/?limit=1000')
      .then(async (data) => {
        const entries = (data?.results ?? []).filter((entry) => !EXCLUDED_TYPES.has(entry.name));
        const records = await mapLimit(entries, 8, (entry) => api(`type/${entry.name}`));
        const list = entries
          .map((entry, index) => {
            const record = records[index];
            if (!record) return null;
            return {
              id: record.id,
              name: record.name,
              english: englishName(record, record.name),
              record,
            };
          })
          .filter(Boolean);
        return {
          list,
          byName: new Map(list.map((type) => [type.name, type])),
        };
      })
      .catch((error) => {
        typesPromise = undefined;
        throw error;
      });
  }
  return typesPromise;
}

let generationsPromise;

export function getGenerations() {
  if (!generationsPromise) {
    generationsPromise = api('generation/?limit=100')
      .then(async (data) => {
        const entries = data?.results ?? [];
        const records = await mapLimit(entries, 6, (entry) => api(`generation/${entry.name}`));
        return records
          .filter(Boolean)
          .map((record) => ({
            id: record.id,
            name: record.name,
            english: englishName(record, record.name),
            record,
          }))
          .sort((a, b) => a.id - b.id);
      })
      .catch((error) => {
        generationsPromise = undefined;
        throw error;
      });
  }
  return generationsPromise;
}

let versionGroupsPromise;

export function getVersionGroups() {
  if (!versionGroupsPromise) {
    versionGroupsPromise = api('version-group/?limit=1000')
      .then(async (data) => {
        const entries = data?.results ?? [];
        const records = await mapLimit(entries, 8, (entry) => api(`version-group/${entry.name}`));
        return records
          .filter(Boolean)
          .map((record) => ({
            id: record.id,
            name: record.name,
            english: englishName(record, record.name),
            order: record.order ?? record.id,
          }))
          .sort((a, b) => a.order - b.order || a.id - b.id);
      })
      .catch((error) => {
        versionGroupsPromise = undefined;
        throw error;
      });
  }
  return versionGroupsPromise;
}

export async function getEvolutionChain(species) {
  const path = resourcePath(species?.evolution_chain?.url);
  if (!path) return null;
  return api(path);
}

export async function getMove(name) {
  return api(`move/${encodeURIComponent(name)}`);
}

export async function getAbility(name) {
  return api(`ability/${encodeURIComponent(name)}`);
}
