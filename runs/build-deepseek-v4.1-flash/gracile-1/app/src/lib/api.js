import {
  dexNumber,
  englishName,
  humanize,
  idFromUrl,
  shortEffect,
} from './text.js';

export const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');
export const API_ROOT = `${API_BASE}/api/v2`;

const responseCache = new Map();
const TYPE_EXCLUDED = new Set(['stellar', 'unknown', 'shadow']);

function absoluteUrl(pathOrUrl) {
  const value = String(pathOrUrl);
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/api/v2/') || value.startsWith('/media/')) return `${API_BASE}${value}`;
  return `${API_ROOT}/${value.replace(/^\//, '')}`;
}

export async function apiGet(pathOrUrl) {
  const url = absoluteUrl(pathOrUrl);
  if (responseCache.has(url)) return responseCache.get(url);

  const promise = fetch(url).then(async (response) => {
    if (!response.ok) {
      const error = new Error(`API request failed: ${response.status} ${url}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  });

  responseCache.set(url, promise);
  try {
    return await promise;
  } catch (error) {
    responseCache.delete(url);
    throw error;
  }
}

export async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

let typesPromise;
export function getTypes() {
  if (!typesPromise) {
    typesPromise = (async () => {
      const list = await apiGet('type/?limit=100000');
      const allowed = list.results.filter((type) => !TYPE_EXCLUDED.has(type.name));
      const types = await Promise.all(
        allowed.map(async (type, index) => {
          const detail = await apiGet(type.url);
          return {
            ...detail,
            order: index,
            english: englishName(detail, humanize(type.name)),
          };
        }),
      );
      return types;
    })().catch((error) => {
      typesPromise = undefined;
      throw error;
    });
  }
  return typesPromise;
}

let generationsPromise;
export function getGenerations() {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const list = await apiGet('generation/?limit=100000');
      const generations = await Promise.all(
        list.results.map(async (generation, index) => {
          const detail = await apiGet(generation.url);
          return {
            ...detail,
            order: index,
            english: englishName(detail, humanize(generation.name)),
          };
        }),
      );
      return generations;
    })().catch((error) => {
      generationsPromise = undefined;
      throw error;
    });
  }
  return generationsPromise;
}

let versionGroupsPromise;
export function getVersionGroups() {
  if (!versionGroupsPromise) {
    versionGroupsPromise = (async () => {
      const list = await apiGet('version-group/?limit=100000');
      return mapLimit(list.results, 24, async (versionGroup) => {
        const detail = await apiGet(versionGroup.url);
        return {
          ...detail,
          english: humanize(versionGroup.name),
        };
      });
    })().catch((error) => {
      versionGroupsPromise = undefined;
      throw error;
    });
  }
  return versionGroupsPromise;
}

let dexPromise;
export function getDex() {
  if (!dexPromise) {
    dexPromise = (async () => {
      const [speciesList, types, generations] = await Promise.all([
        apiGet('pokemon-species/?limit=100000'),
        getTypes(),
        getGenerations(),
      ]);

      const generationBySpecies = new Map();
      for (const generation of generations) {
        for (const species of generation.pokemon_species ?? []) {
          generationBySpecies.set(species.name, generation.name);
        }
      }

      const species = speciesList.results
        .map((entry) => ({
          id: idFromUrl(entry.url),
          name: entry.name,
        }))
        .filter((entry) => entry.id && entry.id <= 10000)
        .sort((a, b) => a.id - b.id);

      const pokemon = await mapLimit(species, 32, async (entry) => {
        try {
          return await apiGet(`pokemon/${entry.id}/`);
        } catch {
          return null;
        }
      });

      const typeByApiName = new Map(types.map((type) => [type.name, type]));
      const items = species.map((entry, index) => {
        const detail = pokemon[index];
        const typeEntries = (detail?.types ?? [])
          .slice()
          .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
        return {
          id: entry.id,
          name: entry.name,
          displayName: humanize(entry.name),
          generation: generationBySpecies.get(entry.name) ?? '',
          sprite:
            detail?.sprites?.front_default ??
            `${API_BASE}/media/sprites/pokemon/${entry.id}.png`,
          types: typeEntries.map((entryType) => ({
            name: entryType.type.name,
            english: typeByApiName.get(entryType.type.name)?.english ?? humanize(entryType.type.name),
          })),
        };
      });

      return { items, types, generations, typeByApiName };
    })().catch((error) => {
      dexPromise = undefined;
      throw error;
    });
  }
  return dexPromise;
}

export async function loadSpecies(name) {
  const species = await apiGet(`pokemon-species/${encodeURIComponent(name)}/`);
  return species;
}

export async function getDefaultPokemon(species) {
  const variety = species.varieties?.find((entry) => entry.is_default);
  if (variety) return apiGet(variety.pokemon.url);
  return apiGet(`pokemon/${species.id}/`);
}

export async function getEvolutionChain(species) {
  if (!species.evolution_chain?.url) return null;
  return apiGet(species.evolution_chain.url);
}

function pokemonCardFromDetail(pokemon, extra = {}) {
  return {
    pokemonName: pokemon.name,
    pokemonId: pokemon.id,
    speciesId: idFromUrl(pokemon.species?.url) ?? pokemon.id,
    speciesName: pokemon.species?.name ?? pokemon.name,
    displayName: humanize(pokemon.species?.name ?? pokemon.name),
    sprite: pokemon.sprites?.front_default ?? null,
    ...extra,
  };
}

export async function mapPokemonRefsToSpecies(entries, { hidden = false } = {}) {
  const refs = (entries ?? []).map((entry) => ({
    ref: entry.pokemon ?? entry,
    hidden: hidden ? Boolean(entry.is_hidden) : false,
  }));

  const cards = await mapLimit(refs, 32, async ({ ref, hidden: isHidden }) => {
    const pokemonId = idFromUrl(ref.url);
    if (!pokemonId || pokemonId > 10000) return null;
    try {
      const pokemon = await apiGet(ref.url);
      if (pokemon.id > 10000) return null;
      return pokemonCardFromDetail(pokemon, { hidden: isHidden });
    } catch {
      return null;
    }
  });

  const bySpecies = new Map();
  for (const card of cards) {
    if (!card) continue;
    const existing = bySpecies.get(card.speciesId);
    if (!existing) {
      bySpecies.set(card.speciesId, { ...card, hidden: card.hidden });
    } else if (card.hidden) {
      existing.hidden = true;
    }
  }

  return [...bySpecies.values()].sort((a, b) => a.speciesId - b.speciesId);
}

export async function getMoveRecord(name) {
  const move = await apiGet(`move/${encodeURIComponent(name)}/`);
  return move;
}

export async function getAbilityRecord(name) {
  const ability = await apiGet(`ability/${encodeURIComponent(name)}/`);
  return ability;
}

export async function getTypeRecord(name) {
  const type = await apiGet(`type/${encodeURIComponent(name)}/`);
  if (TYPE_EXCLUDED.has(type.name)) {
    const error = new Error('Type is not part of the Pokédex');
    error.status = 404;
    throw error;
  }
  return type;
}

export async function getMoveCardData(move) {
  const types = await getTypes();
  const typeByApiName = new Map(types.map((type) => [type.name, type]));
  return {
    ...move,
    displayName: englishName(move, humanize(move.name)),
    typeEnglish: typeByApiName.get(move.type?.name)?.english ?? humanize(move.type?.name),
  };
}

export async function getAbilityCardData(ability) {
  return {
    ...ability,
    displayName: englishName(ability, humanize(ability.name)),
    effect: shortEffect(ability) ?? '—',
  };
}

export async function getPokemonPageData(name) {
  const species = await loadSpecies(name);
  const [pokemon, types, chain] = await Promise.all([
    getDefaultPokemon(species),
    getTypes(),
    getEvolutionChain(species),
  ]);
  const typeByApiName = new Map(types.map((type) => [type.name, type]));
  const evolutionChain = chain?.chain ?? null;

  return {
    species,
    pokemon,
    typeByApiName,
    evolutionChain,
    englishName: englishName(species, humanize(species.name)),
    dexNumber: dexNumber(species.id),
  };
}

const METHOD_PRIORITY = new Map([
  ['level-up', 0],
  ['machine', 1],
  ['egg', 2],
  ['tutor', 3],
]);

export async function buildPokemonPage(name, gameParam) {
  const base = await getPokemonPageData(name);
  const versionGroups = await getVersionGroups();
  const gameNames = new Set(
    base.pokemon.moves.flatMap((move) =>
      (move.version_group_details ?? []).map((detail) => detail.version_group.name),
    ),
  );
  const games = versionGroups
    .filter((group) => gameNames.has(group.name))
    .sort((a, b) => a.order - b.order);
  const defaultGame = games.reduce(
    (latest, group) => (!latest || group.order > latest.order ? group : latest),
    null,
  );
  const requested = games.find((group) => group.name === gameParam);
  const selectedGame = requested ?? defaultGame;

  const selectedMoves = [];
  if (selectedGame) {
    for (const pokemonMove of base.pokemon.moves) {
      for (const detail of pokemonMove.version_group_details ?? []) {
        if (detail.version_group.name !== selectedGame.name) continue;
        selectedMoves.push({
          name: pokemonMove.move.name,
          method: detail.move_learn_method.name,
          level: detail.level_learned_at,
        });
      }
    }
  }

  const uniqueMoveNames = [...new Set(selectedMoves.map((move) => move.name))];
  const records = await mapLimit(uniqueMoveNames, 24, async (moveName) => {
    try {
      return await apiGet(`move/${moveName}/`);
    } catch {
      return null;
    }
  });
  const moveByName = new Map(records.filter(Boolean).map((move) => [move.name, move]));

  const byMethod = new Map();
  for (const selected of selectedMoves) {
    const move = moveByName.get(selected.name);
    if (!move) continue;
    const rows = byMethod.get(selected.method) ?? [];
    rows.push({
      name: move.name,
      english: englishName(move, humanize(move.name)),
      typeName: move.type?.name ?? '',
      typeEnglish:
        base.typeByApiName.get(move.type?.name)?.english ?? humanize(move.type?.name ?? ''),
      category: humanize(move.damage_class?.name ?? ''),
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      level: selected.level,
      method: selected.method,
    });
    byMethod.set(selected.method, rows);
  }

  const methods = [...byMethod.keys()].sort((a, b) => {
    const priorityA = METHOD_PRIORITY.get(a) ?? 4;
    const priorityB = METHOD_PRIORITY.get(b) ?? 4;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return humanize(a).localeCompare(humanize(b));
  });

  const moveTables = methods.map((method) => {
    const rows = byMethod.get(method) ?? [];
    rows.sort((a, b) => {
      if (method === 'level-up' && a.level !== b.level) return a.level - b.level;
      return a.english.localeCompare(b.english);
    });
    return { method, title: humanize(method), rows };
  });

  return {
    ...base,
    games,
    selectedGame,
    defaultGame,
    moveTables,
  };
}
