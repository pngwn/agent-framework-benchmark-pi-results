import {
  TYPE_NAMES,
  englishName,
  humanize,
  idFromUrl,
} from './format.js';

const cache = new Map();

function apiBase() {
  return (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/$/, '');
}

export function absoluteApiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function getJson(path) {
  const url = absoluteApiUrl(path);
  let promise = cache.get(url);
  if (!promise) {
    promise = fetch(url, { headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) {
          const error = new Error(`API request failed (${response.status}): ${url}`);
          error.status = response.status;
          throw error;
        }
        return response.json();
      })
      .catch((error) => {
        cache.delete(url);
        throw error;
      });
    cache.set(url, promise);
  }
  return promise;
}

export async function tryGetJson(path) {
  try {
    return await getJson(path);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export async function getAll(resource) {
  const data = await getJson(`/api/v2/${resource}/?limit=100000`);
  return data.results || [];
}

function sortById(entries) {
  return [...entries].sort((a, b) => a.id - b.id);
}

export async function getSpeciesIndex() {
  const results = await getAll('pokemon-species');
  return sortById(
    results
      .map((entry) => ({ name: entry.name, url: entry.url, id: idFromUrl(entry.url) }))
      .filter((entry) => entry.id !== null),
  );
}

export async function getSpecies(name) {
  return tryGetJson(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`);
}

export async function getPokemon(name) {
  return tryGetJson(`/api/v2/pokemon/${encodeURIComponent(name)}/`);
}

export async function getMove(name) {
  return tryGetJson(`/api/v2/move/${encodeURIComponent(name)}/`);
}

export async function getAbility(name) {
  return tryGetJson(`/api/v2/ability/${encodeURIComponent(name)}/`);
}

export async function getType(name) {
  return tryGetJson(`/api/v2/type/${encodeURIComponent(name)}/`);
}

export async function getEvolutionChain(url) {
  return tryGetJson(url);
}

let typeCatalogPromise;
export async function getTypeCatalog() {
  if (!typeCatalogPromise) {
    typeCatalogPromise = (async () => {
      const results = await getAll('type');
      const selected = results.filter((entry) => TYPE_NAMES.has(entry.name));
      const details = await Promise.all(selected.map((entry) => getJson(entry.url)));
      return details.map((type) => ({
        id: type.id,
        name: type.name,
        label: englishName(type, type.name),
        resource: type,
      }));
    })();
  }
  return typeCatalogPromise;
}

let generationCatalogPromise;
export async function getGenerationCatalog() {
  if (!generationCatalogPromise) {
    generationCatalogPromise = (async () => {
      const results = await getAll('generation');
      const details = await Promise.all(results.map((entry) => getJson(entry.url)));
      return details.map((generation, index) => ({
        index,
        id: generation.id,
        name: generation.name,
        label: englishName(generation, generation.name),
        resource: generation,
      }));
    })();
  }
  return generationCatalogPromise;
}

let listModelPromise;
export async function getPokemonListModel() {
  if (!listModelPromise) {
    listModelPromise = (async () => {
      const [species, types, generations] = await Promise.all([
        getSpeciesIndex(),
        getTypeCatalog(),
        getGenerationCatalog(),
      ]);

      const typeById = new Map();
      for (const type of types) {
        for (const entry of type.resource.pokemon || []) {
          const id = idFromUrl(entry.pokemon?.url);
          if (id === null || id > 10000) continue;
          const slots = typeById.get(id) || [];
          slots.push({ slot: entry.slot ?? slots.length + 1, name: type.name, label: type.label });
          typeById.set(id, slots);
        }
      }

      const generationById = new Map();
      for (const generation of generations) {
        for (const entry of generation.resource.pokemon_species || []) {
          const id = idFromUrl(entry.url);
          if (id !== null) generationById.set(id, generation.name);
        }
      }

      return {
        species: species.map((entry) => ({
          ...entry,
          displayName: humanize(entry.name),
          types: (typeById.get(entry.id) || []).sort((a, b) => a.slot - b.slot),
          generation: generationById.get(entry.id) || null,
        })),
        types,
        generations,
      };
    })();
  }
  return listModelPromise;
}

let versionGroupIndexPromise;
async function getVersionGroupIndex() {
  if (!versionGroupIndexPromise) {
    versionGroupIndexPromise = getAll('version-group');
  }
  return versionGroupIndexPromise;
}

export async function getVersionGroupsForPokemon(pokemon) {
  const names = new Set();
  for (const move of pokemon.moves || []) {
    for (const detail of move.version_group_details || []) {
      if (detail.version_group?.name) names.add(detail.version_group.name);
    }
  }
  const index = await getVersionGroupIndex();
  const byName = new Map(index.map((entry) => [entry.name, entry.url]));
  const groups = await Promise.all(
    [...names].map(async (name) => {
      const url = byName.get(name) || `/api/v2/version-group/${encodeURIComponent(name)}/`;
      const resource = await getJson(url);
      return {
        id: resource.id,
        name: resource.name,
        label: humanize(resource.name),
        order: resource.order ?? 0,
      };
    }),
  );
  return groups.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export async function getMoveRows(pokemon, versionGroupName) {
  const byMethod = new Map();
  const moveNames = new Set();

  for (const move of pokemon.moves || []) {
    const details = (move.version_group_details || []).filter(
      (detail) => detail.version_group?.name === versionGroupName,
    );
    for (const detail of details) {
      const method = detail.move_learn_method?.name || 'other';
      byMethod.set(method, byMethod.get(method) || []);
      byMethod.get(method).push({
        method,
        level: detail.level_learned_at,
        moveName: move.move.name,
      });
      moveNames.add(move.move.name);
    }
  }

  const moveResources = new Map();
  await Promise.all(
    [...moveNames].map(async (name) => {
      const resource = await getMove(name);
      if (resource) moveResources.set(name, resource);
    }),
  );

  const methods = [...byMethod.entries()].map(([method, entries]) => {
    const rows = [];
    for (const entry of byMethod.get(method)) {
      const move = moveResources.get(entry.moveName);
      if (!move) continue;
      rows.push({
        level: entry.level,
        moveName: entry.moveName,
        moveLabel: englishName(move, entry.moveName),
        typeName: move.type?.name || '',
        typeLabel: humanize(move.type?.name || ''),
        categoryName: move.damage_class?.name || '',
        categoryLabel: humanize(move.damage_class?.name || ''),
        power: move.power,
        accuracy: move.accuracy,
        pp: move.pp,
      });
    }
    return { method, label: humanize(method), rows };
  });

  const fixedOrder = ['level-up', 'machine', 'egg', 'tutor'];
  methods.sort((a, b) => {
    const ai = fixedOrder.indexOf(a.method);
    const bi = fixedOrder.indexOf(b.method);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.label.localeCompare(b.label);
  });

  for (const table of methods) {
    if (table.method === 'level-up') {
      table.rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.moveLabel.localeCompare(b.moveLabel));
    } else {
      table.rows.sort((a, b) => a.moveLabel.localeCompare(b.moveLabel));
    }
  }

  return methods.filter((table) => table.rows.length > 0);
}

export async function getSpeciesNameMap() {
  const species = await getSpeciesIndex();
  return new Map(species.map((entry) => [entry.id, entry]));
}

export function defaultPokemonReference(species) {
  const varieties = species.varieties || [];
  return (
    varieties.find((variety) => variety.is_default)?.pokemon ||
    varieties[0]?.pokemon ||
    null
  );
}
