import { EM_DASH, englishGenus, englishName, englishShortEffect, humanize, latestEnglishFlavor } from '#lib/format.js';

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let indexPromise;

function apiRoot() {
  const base = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');
  return `${base}/api/v2`;
}

export function apiUrl(path = '') {
  return `${apiRoot()}/${String(path).replace(/^\/+/, '')}`;
}

function recordUrl(resource, nameOrId) {
  return `${apiUrl(resource)}/${encodeURIComponent(nameOrId)}/`;
}

function listUrl(resource) {
  return `${apiUrl(resource)}/?limit=100000`;
}

// Small runtime response cache. Index building deliberately avoids filling it
// with the full pokemon/species dumps, which are large and only needed once.
const responseCache = new Map();
const CACHE_LIMIT = 1200;

async function getJson(url, { store = true } = {}) {
  if (store && responseCache.has(url)) return responseCache.get(url);

  const promise = fetch(url).then(async (response) => {
    if (!response.ok) {
      const error = new Error(`API request failed (${response.status}): ${url}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  });

  if (store) {
    responseCache.set(url, promise);
    if (responseCache.size > CACHE_LIMIT) {
      const oldest = responseCache.keys().next().value;
      if (oldest !== undefined) responseCache.delete(oldest);
    }
    promise.catch(() => responseCache.delete(url));
  }

  return promise;
}

function idFromUrl(url) {
  const match = String(url).match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function fetchMove(name) {
  return getJson(recordUrl('move', name));
}

export async function fetchAbility(name) {
  return getJson(recordUrl('ability', name));
}

export async function fetchType(name) {
  return getJson(recordUrl('type', name));
}

export async function fetchEvolutionChain(url) {
  return getJson(url);
}

export async function fetchPokemon(name) {
  return getJson(recordUrl('pokemon', name));
}

async function fetchVersionGroup(name) {
  return getJson(recordUrl('version-group', name));
}

async function buildIndex() {
  const [speciesList, pokemonList, typeList, generationList] = await Promise.all([
    getJson(listUrl('pokemon-species'), { store: false }),
    getJson(listUrl('pokemon'), { store: false }),
    getJson(listUrl('type')),
    getJson(listUrl('generation'))
  ]);

  const speciesIds = speciesList.results
    .map((entry) => idFromUrl(entry.url))
    .filter((id) => Number.isInteger(id) && id <= 10000);

  const pokemonIds = pokemonList.results
    .map((entry) => idFromUrl(entry.url))
    .filter((id) => Number.isInteger(id) && id <= 10000);

  const [speciesRecords, pokemonRecords, typeRecords, generationRecords] = await Promise.all([
    mapLimit(speciesIds, 64, (id) => getJson(recordUrl('pokemon-species', id), { store: false })),
    mapLimit(pokemonIds, 64, (id) => getJson(recordUrl('pokemon', id), { store: false })),
    mapLimit(
      typeList.results.filter((entry) => !EXCLUDED_TYPES.has(entry.name)),
      12,
      (entry) => getJson(entry.url)
    ),
    mapLimit(generationList.results, 9, (entry) => getJson(entry.url))
  ]);

  const types = typeRecords.map((record) => ({
    name: record.name,
    label: englishName(record, humanize(record.name)),
    order: idFromUrl(record.url) ?? record.id
  }));

  const generations = generationRecords
    .map((record) => ({
      name: record.name,
      label: englishName(record, humanize(record.name)),
      id: record.id
    }))
    .sort((a, b) => a.id - b.id);

  const typeLabels = new Map(types.map((type) => [type.name, type.label]));
  const pokemonById = new Map(pokemonRecords.map((record) => [record.id, record]));

  const species = speciesRecords
    .map((record) => {
      const variety = record.varieties?.find((entry) => entry.is_default) ?? record.varieties?.[0];
      const varietyId = variety ? idFromUrl(variety.pokemon?.url) : record.id;
      const pokemon = pokemonById.get(varietyId) ?? pokemonById.get(record.id);

      return {
        id: record.id,
        name: record.name,
        humanized: humanize(record.name),
        englishName: englishName(record, humanize(record.name)),
        genus: englishGenus(record),
        generation: record.generation?.name ?? '',
        flavorText: latestEnglishFlavor(record.flavor_text_entries) ?? '',
        evolutionChainUrl: record.evolution_chain?.url ?? null,
        defaultPokemonName: variety?.pokemon?.name ?? record.name,
        sprite: pokemon?.sprites?.front_default ?? null,
        artwork: pokemon?.sprites?.other?.['official-artwork']?.front_default ?? pokemon?.sprites?.front_default ?? null,
        types: (pokemon?.types ?? [])
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((entry) => ({
            name: entry.type.name,
            label: typeLabels.get(entry.type.name) ?? humanize(entry.type.name)
          })),
        abilities: (pokemon?.abilities ?? [])
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((entry) => ({
            name: entry.ability.name,
            hidden: Boolean(entry.is_hidden),
            label: humanize(entry.ability.name)
          }))
      };
    })
    .sort((a, b) => a.id - b.id);

  return {
    species,
    speciesByName: new Map(species.map((entry) => [entry.name, entry])),
    speciesById: new Map(species.map((entry) => [entry.id, entry])),
    types,
    generations,
    typeLabels
  };
}

export function getIndex() {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  return indexPromise;
}

async function buildGameData(pokemon, selectedName) {
  const versionGroupNames = new Set();
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      versionGroupNames.add(detail.version_group.name);
    }
  }

  const versionGroups = await mapLimit([...versionGroupNames], 12, async (name) => {
    try {
      const record = await fetchVersionGroup(name);
      return { name, label: humanize(name), order: record.order ?? 0 };
    } catch {
      return { name, label: humanize(name), order: 0 };
    }
  });
  versionGroups.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const selected = versionGroups.find((group) => group.name === selectedName)
    ?? versionGroups[versionGroups.length - 1]
    ?? null;

  if (!selected) {
    return { games: versionGroups, selectedGame: null, tables: [] };
  }

  const entries = [];
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group.name !== selected.name) continue;
      entries.push({
        moveName: move.move.name,
        method: detail.move_learn_method.name,
        level: detail.level_learned_at ?? 0
      });
    }
  }

  const unique = new Map();
  for (const entry of entries) {
    unique.set(`${entry.method}|${entry.moveName}|${entry.level}`, entry);
  }

  const moveNames = [...new Set([...unique.values()].map((entry) => entry.moveName))];
  const moveRecords = new Map(
    await mapLimit(moveNames, 24, async (name) => [name, await fetchMove(name)])
  );

  const rows = [...unique.values()].map((entry) => {
    const move = moveRecords.get(entry.moveName);
    const typeName = move?.type?.name ?? '';
    return {
      move: entry.moveName,
      moveLabel: englishName(move, humanize(entry.moveName)),
      type: typeName,
      typeLabel: move?.type ? (typeName ? humanize(typeName) : '') : '',
      category: move?.damage_class?.name ?? null,
      categoryLabel: move?.damage_class?.name ? humanize(move.damage_class.name) : EM_DASH,
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
      level: entry.level,
      method: entry.method
    };
  });

  const methodOrder = ['level-up', 'machine', 'egg', 'tutor'];
  const methodLabels = new Map();
  for (const row of rows) {
    if (!methodLabels.has(row.method)) methodLabels.set(row.method, humanize(row.method));
  }

  const methods = [...methodLabels.keys()].sort((a, b) => {
    const ai = methodOrder.indexOf(a);
    const bi = methodOrder.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return methodLabels.get(a).localeCompare(methodLabels.get(b));
  });

  const tables = methods
    .map((method) => {
      const tableRows = rows.filter((row) => row.method === method);
      tableRows.sort((a, b) => {
        if (method === 'level-up' && a.level !== b.level) return a.level - b.level;
        return a.moveLabel.localeCompare(b.moveLabel);
      });
      return {
        method,
        label: methodLabels.get(method),
        hasLevel: method === 'level-up',
        rows: tableRows
      };
    })
    .filter((table) => table.rows.length > 0);

  return { games: versionGroups, selectedGame: selected, tables };
}

export async function loadPokemonPage(name, gameName) {
  const index = await getIndex();
  const species = index.speciesByName.get(name);
  if (!species) return { notFound: true };

  let pokemon;
  try {
    pokemon = await fetchPokemon(species.defaultPokemonName);
  } catch (error) {
    if (error?.status === 404) return { notFound: true };
    throw error;
  }

  const stats = (pokemon.stats ?? []).map((entry) => ({
    name: entry.stat.name,
    label: {
      hp: 'HP',
      attack: 'Attack',
      defense: 'Defense',
      'special-attack': 'Sp. Atk',
      'special-defense': 'Sp. Def',
      speed: 'Speed'
    }[entry.stat.name] ?? humanize(entry.stat.name),
    value: entry.base_stat
  }));

  let evolutionRoot = null;
  if (species.evolutionChainUrl) {
    try {
      const chain = await fetchEvolutionChain(species.evolutionChainUrl);
      evolutionRoot = chain.chain ?? null;
    } catch {
      evolutionRoot = null;
    }
  }

  const gameData = await buildGameData(pokemon, gameName);

  return {
    notFound: false,
    species: {
      id: species.id,
      name: species.name,
      englishName: species.englishName,
      genus: species.genus,
      types: species.types,
      artwork: species.artwork,
      flavorText: species.flavorText
    },
    height: pokemon.height,
    weight: pokemon.weight,
    stats,
    total: stats.reduce((sum, stat) => sum + stat.value, 0),
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.ability.name,
        label: humanize(entry.ability.name),
        hidden: Boolean(entry.is_hidden)
      })),
    evolution: evolutionRoot,
    games: gameData.games,
    selectedGame: gameData.selectedGame,
    tables: gameData.tables,
    typeLabels: Object.fromEntries(index.typeLabels)
  };
}

export async function loadMovePage(name) {
  const index = await getIndex();
  let move;
  try {
    move = await fetchMove(name);
  } catch (error) {
    if (error?.status === 404) return { notFound: true };
    throw error;
  }

  const learnedBy = (move.learned_by_pokemon ?? [])
    .map((entry) => idFromUrl(entry.url))
    .filter((id) => Number.isInteger(id) && id <= 10000)
    .map((id) => index.speciesById.get(id))
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);

  const effect = englishShortEffect(move)
    ?? latestEnglishFlavor(move.flavor_text_entries)
    ?? EM_DASH;

  return {
    notFound: false,
    move: {
      name: move.name,
      englishName: englishName(move, humanize(move.name)),
      type: move.type?.name ? {
        name: move.type.name,
        label: index.typeLabels.get(move.type.name) ?? humanize(move.type.name)
      } : null,
      category: move.damage_class?.name ? humanize(move.damage_class.name) : EM_DASH,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      effect
    },
    learnedBy
  };
}

export async function loadAbilityPage(name) {
  const index = await getIndex();
  let ability;
  try {
    ability = await fetchAbility(name);
  } catch (error) {
    if (error?.status === 404) return { notFound: true };
    throw error;
  }

  const byId = new Map();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url);
    if (!Number.isInteger(id) || id > 10000) continue;
    const species = index.speciesById.get(id);
    if (!species) continue;
    const previous = byId.get(id);
    byId.set(id, {
      species,
      hidden: Boolean(entry.is_hidden) || Boolean(previous?.hidden)
    });
  }

  const pokemon = [...byId.values()]
    .sort((a, b) => a.species.id - b.species.id)
    .map((entry) => ({ ...entry.species, hidden: entry.hidden }));

  return {
    notFound: false,
    ability: {
      name: ability.name,
      englishName: englishName(ability, humanize(ability.name)),
      effect: englishShortEffect(ability) ?? EM_DASH
    },
    pokemon
  };
}

export async function loadTypePage(name) {
  const index = await getIndex();
  const meta = index.types.find((type) => type.name === name);
  if (!meta) return { notFound: true };

  let type;
  try {
    type = await fetchType(name);
  } catch (error) {
    if (error?.status === 404) return { notFound: true };
    throw error;
  }

  const label = (related) => index.typeLabels.get(related.name) ?? humanize(related.name);
  const related = (entries) => (entries ?? []).map((entry) => ({
    name: entry.name,
    label: label(entry)
  }));
  const damage = type.damage_relations ?? {};

  const relations = [
    { term: 'Super effective against', types: related(damage.double_damage_to) },
    { term: 'Not very effective against', types: related(damage.half_damage_to) },
    { term: 'No effect against', types: related(damage.no_damage_to) },
    { term: 'Weak to', types: related(damage.double_damage_from) },
    { term: 'Resists', types: related(damage.half_damage_from) },
    { term: 'Immune to', types: related(damage.no_damage_from) }
  ];

  const pokemon = index.species.filter((species) =>
    species.types.some((entry) => entry.name === name)
  );

  const moves = (type.moves ?? [])
    .map((move) => ({ name: move.name, label: humanize(move.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    notFound: false,
    type: {
      name: type.name,
      englishName: englishName(type, humanize(type.name))
    },
    relations,
    pokemon,
    moves
  };
}
