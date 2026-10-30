const API_BASE = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
const EXCLUDED_METHOD_FIRST = ['level-up', 'machine', 'egg', 'tutor'];

const cache = (globalThis.__pokedexCache ??= new Map());

function cached(key, loader) {
  if (!cache.has(key)) {
    const promise = Promise.resolve().then(loader);
    cache.set(key, promise);
    promise.catch(() => cache.delete(key));
  }
  return cache.get(key);
}

export function mediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function spriteUrl(pokemonId) {
  return `${API_BASE}/media/sprites/pokemon/${pokemonId}.png`;
}

export function humanize(name) {
  if (!name) return '';
  return String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function englishName(names) {
  const entry = (names || []).find((n) => n.language?.name === 'en');
  return entry?.name ?? null;
}

export function englishGenus(genera) {
  const entry = (genera || []).find((g) => g.language?.name === 'en');
  return entry?.genus ?? null;
}

export function latestEnglishFlavorText(entries) {
  const entry = (entries || []).filter((e) => e.language?.name === 'en').at(-1);
  if (!entry?.flavor_text) return null;
  return entry.flavor_text.replace(/\s+/g, ' ').trim();
}

export function englishShortEffect(entries) {
  return (entries || []).find((e) => e.language?.name === 'en')?.short_effect ?? null;
}

function idFromUrl(url) {
  const match = String(url || '').match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

async function fetchJson(path) {
  const url = /^https?:\/\//.test(path) ? path : `${API_BASE}/api/v2/${path.replace(/^\/+/, '')}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`PokeAPI request failed (${res.status}) for ${url}`);
  }
  return res.json();
}

async function mapLimit(items, limit, mapper) {
  const list = [...items];
  const results = new Array(list.length);
  let next = 0;
  const workerCount = Math.max(1, Math.min(limit, list.length));
  async function worker() {
    while (next < list.length) {
      const index = next++;
      results[index] = await mapper(list[index], index);
    }
  }
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

function list(resource) {
  return cached(`list:${resource}`, async () => {
    const data = await fetchJson(`${resource}/?limit=100000`);
    return (data?.results ?? [])
      .map((entry) => ({ name: entry.name, id: idFromUrl(entry.url) }))
      .filter((entry) => entry.id !== null);
  });
}

export function getSpeciesIndex() {
  return cached('species-index', async () => {
    const entries = await list('pokemon-species');
    return entries.filter((entry) => entry.id <= 10000).sort((a, b) => a.id - b.id);
  });
}

export async function getSpeciesByIdMap() {
  const entries = await getSpeciesIndex();
  return new Map(entries.map((entry) => [entry.id, entry]));
}

export function getGenerations() {
  return cached('generations', async () => {
    const entries = await list('generation');
    const records = await mapLimit(entries, 7, (entry) => fetchJson(`generation/${entry.id}/`));
    return records
      .filter(Boolean)
      .map((record) => ({
        id: record.id,
        name: record.name,
        englishName: englishName(record.names) || humanize(record.name),
        species: (record.pokemon_species || [])
          .map((entry) => ({ name: entry.name, id: idFromUrl(entry.url) }))
          .filter((entry) => entry.id !== null && entry.id <= 10000),
      }))
      .sort((a, b) => a.id - b.id);
  });
}

export function getTypes() {
  return cached('types', async () => {
    const entries = await list('type');
    const allowed = entries.filter((entry) => !EXCLUDED_TYPES.has(entry.name));
    const records = await mapLimit(allowed, 7, (entry) => fetchJson(`type/${entry.id}/`));
    return records
      .filter(Boolean)
      .map((record) => ({
        id: record.id,
        name: record.name,
        englishName: englishName(record.names) || humanize(record.name),
        damageRelations: record.damage_relations || {},
        pokemon: (record.pokemon || []).map((entry) => ({
          slot: entry.slot,
          name: entry.pokemon?.name,
          id: idFromUrl(entry.pokemon?.url),
        })),
        moves: (record.moves || []).map((entry) => ({
          name: entry.name,
          id: idFromUrl(entry.url),
        })),
      }));
  });
}

export function getTypeMap() {
  return cached('type-map', async () => {
    const types = await getTypes();
    const byName = new Map(types.map((type) => [type.name, type]));
    const bySpecies = new Map();
    for (const type of types) {
      for (const entry of type.pokemon) {
        if (!entry.id || entry.id > 10000) continue;
        const current = bySpecies.get(entry.id) ?? [];
        current.push({
          slot: entry.slot,
          name: type.name,
          englishName: type.englishName,
        });
        bySpecies.set(entry.id, current);
      }
    }
    for (const values of bySpecies.values()) values.sort((a, b) => a.slot - b.slot);
    return { byName, bySpecies };
  });
}

export async function getHomeData() {
  const [species, generations, types, typeMaps] = await Promise.all([
    getSpeciesIndex(),
    getGenerations(),
    getTypes(),
    getTypesBySpecies(),
  ]);

  const generationBySpecies = new Map();
  for (const generation of generations) {
    for (const entry of generation.species) {
      generationBySpecies.set(entry.id, {
        name: generation.name,
        englishName: generation.englishName,
      });
    }
  }

  return {
    species: species.map((entry) => ({
      id: entry.id,
      name: entry.name,
      humanizedName: humanize(entry.name),
      types: typeMaps.get(entry.id) ?? [],
      generation: generationBySpecies.get(entry.id)?.name ?? null,
    })),
    generations: generations.map(({ name, englishName: label }) => ({ name, label })),
    types: types.map(({ name, englishName: label }) => ({ name, label })),
  };
}

function getTypesBySpecies() {
  return cached('types-by-species', async () => {
    const { bySpecies } = await getTypeMap();
    return bySpecies;
  });
}

export function getSpecies(key) {
  return cached(`species:${String(key).toLowerCase()}`, () => fetchJson(`pokemon-species/${encodeURIComponent(key)}/`));
}

export function getPokemon(key) {
  return cached(`pokemon:${String(key).toLowerCase()}`, () => fetchJson(`pokemon/${encodeURIComponent(key)}/`));
}

export function getMove(key) {
  return cached(`move:${String(key).toLowerCase()}`, () => fetchJson(`move/${encodeURIComponent(key)}/`));
}

export function getAbility(key) {
  return cached(`ability:${String(key).toLowerCase()}`, () => fetchJson(`ability/${encodeURIComponent(key)}/`));
}

export function getType(key) {
  return cached(`type:${String(key).toLowerCase()}`, () => fetchJson(`type/${encodeURIComponent(key)}/`));
}

function getVersionGroup(key) {
  return cached(`version-group:${String(key).toLowerCase()}`, () =>
    fetchJson(`version-group/${encodeURIComponent(key)}/`),
  );
}

function getEvolutionChain(key) {
  return cached(`evolution-chain:${String(key).toLowerCase()}`, () =>
    fetchJson(`evolution-chain/${encodeURIComponent(key)}/`),
  );
}

function chainId(chainRef) {
  if (!chainRef) return null;
  return idFromUrl(chainRef.url);
}

function serializeEvolutionNode(node) {
  if (!node?.species?.name) return null;
  return {
    speciesName: node.species.name,
    speciesId: idFromUrl(node.species.url),
    evolvesTo: (node.evolves_to || []).map(serializeEvolutionNode).filter(Boolean),
  };
}

export async function getPokemonPageData(key, requestedGame) {
  const species = await getSpecies(key);
  if (!species) return null;

  const defaultVariety = (species.varieties || []).find((variety) => variety.is_default);
  const pokemonKey = defaultVariety?.pokemon?.name || species.id;

  const [pokemon, types, evolutionChain] = await Promise.all([
    getPokemon(pokemonKey),
    getTypes(),
    chainId(species.evolution_chain) ? getEvolutionChain(chainId(species.evolution_chain)) : null,
  ]);

  if (!pokemon) return null;

  const typeByApiName = new Map(types.map((type) => [type.name, type]));

  const versionGroupNames = new Set();
  for (const move of pokemon.moves || []) {
    for (const detail of move.version_group_details || []) {
      if (detail.version_group?.name) versionGroupNames.add(detail.version_group.name);
    }
  }

  const versionGroups = (
    await mapLimit([...versionGroupNames], 8, (name) => getVersionGroup(name))
  )
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);

  const selectedGame =
    versionGroups.find((game) => game.name === requestedGame) || versionGroups.at(-1) || null;

  const candidates = [];
  const seenMoves = new Set();
  if (selectedGame) {
    for (const move of pokemon.moves || []) {
      const detail = (move.version_group_details || []).find(
        (item) => detailGameName(item) === selectedGame.name,
      );
      if (!detail) continue;
      const methodName = detail.move_learn_method?.name || '';
      const moveName = move.move?.name;
      if (!moveName) continue;
      const dedupeKey = `${methodKey(methodName)}:${moveName}`;
      if (seenMoves.has(dedupeKey)) continue;
      seenMoves.add(dedupeKey);
      candidates.push({
        moveName,
        method: methodName,
        level: detail.level_learned_at ?? 0,
      });
    }
  }

  const moveRecords = await mapLimit(candidates, 18, (candidate) => getMove(candidate.moveName));
  const methods = new Map();
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const move = moveRecords[i];
    if (!move) continue;
    const methodName = candidate.method;
    const row = {
      id: `${methodKey(methodName)}-${move.name}`,
      level: candidate.level,
      moveName: englishName(move.names) || humanize(move.name),
      moveApiName: move.name,
      typeName: move.type?.name ?? '',
      typeEnglish: typeByApiName.get(move.type?.name)?.englishName || humanize(move.type?.name),
      category: humanize(move.damage_class?.name),
      power: move.power ?? null,
      accuracy: move.accuracy ?? null,
      pp: move.pp ?? null,
    };
    const groupKey = methodKey(methodName);
    if (!methods.has(groupKey)) {
      methods.set(groupKey, {
        name: methodName,
        label: humanize(methodName),
        rows: [],
      });
    }
    methods.get(groupKey).rows.push(row);
  }

  const methodOrder = [...methods.values()].sort((a, b) => {
    const ai = EXCLUDED_METHOD_FIRST.indexOf(a.name);
    const bi = EXCLUDED_METHOD_FIRST.indexOf(b.name);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.label.localeCompare(b.label, 'en');
  });

  return {
    species,
    pokemon,
    englishName: englishName(species.names) || humanize(species.name),
    genus: englishGenus(species.genera),
    flavorText: latestEnglishFlavorText(species.flavor_text_entries),
    types: (pokemon.types || [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.type?.name,
        englishName: typeByApiName.get(entry.type?.name)?.englishName || humanize(entry.type?.name),
      })),
    stats: (pokemon.stats || []).map((entry) => ({
      name: entry.stat?.name,
      label: statLabel(entry.stat?.name),
      value: entry.base_stat,
    })),
    abilities: (pokemon.abilities || [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.ability?.name,
        label: humanize(entry.ability?.name),
        hidden: Boolean(entry.is_hidden),
      })),
    evolution: serializeEvolutionNode(evolutionChain?.chain),
    games: versionGroups.map((game) => ({
      name: game.name,
      label: humanize(game.name),
      order: game.order,
    })),
    selectedGame: selectedGame?.name ?? null,
    moveTables: methodOrder,
  };
}

function detailGameName(detail) {
  return detail.version_group?.name;
}

function methodKey(name) {
  return String(name || '').toLowerCase();
}

function statLabel(name) {
  return (
    {
      hp: 'HP',
      attack: 'Attack',
      defense: 'Defense',
      'special-attack': 'Sp. Atk',
      'special-defense': 'Sp. Def',
      speed: 'Speed',
    }[name] ?? humanize(name)
  );
}

function speciesCardsByIds(ids, speciesById) {
  return [...new Set(ids)]
    .filter((id) => id && id <= 10000)
    .sort((a, b) => a - b)
    .map((id) => {
      const species = speciesById.get(id);
      return {
        id,
        speciesName: species?.name ?? String(id),
        humanizedName: humanize(species?.name ?? String(id)),
      };
    });
}

export async function getMovePageData(key) {
  const move = await getMove(key);
  if (!move) return null;
  const speciesById = await getSpeciesByIdMap();
  const learnedBy = speciesCardsByIds(
    (move.learned_by_pokemon || []).map((entry) => idFromUrl(entry.url)),
    speciesById,
  );
  return {
    move,
    englishName: englishName(move.names) || humanize(move.name),
    effect:
      englishShortEffect(move.effect_entries) ||
      latestEnglishFlavorText(move.flavor_text_entries) ||
      '—',
    learnedBy,
  };
}

export async function getAbilityPageData(key) {
  const ability = await getAbility(key);
  if (!ability) return null;
  const speciesById = await getSpeciesByIdMap();
  const hiddenById = new Map();
  for (const entry of ability.pokemon || []) {
    const id = idFromUrl(entry.pokemon?.url);
    if (!id || id > 10000) continue;
    hiddenById.set(id, (hiddenById.get(id) ?? false) || Boolean(entry.is_hidden));
  }
  const pokemon = speciesCardsByIds([...hiddenById.keys()], speciesById).map((card) => ({
    ...card,
    hidden: hiddenById.get(card.id) ?? false,
  }));
  return {
    ability,
    englishName: englishName(ability.names) || humanize(ability.name),
    effect: englishShortEffect(ability.effect_entries) || '—',
    pokemon,
  };
}

export async function getTypePageData(key) {
  const type = await getType(key);
  if (!type || EXCLUDED_TYPES.has(type.name)) return null;
  const speciesById = await getSpeciesByIdMap();

  const relation = (entries) =>
    (entries || []).map((entry) => ({
      name: entry.name,
      englishName: humanize(entry.name),
    }));

  const relations = type.damage_relations || {};
  return {
    type,
    englishName: englishName(type.names) || humanize(type.name),
    damageRelations: [
      { label: 'Super effective against', types: relation(relations.double_damage_to) },
      { label: 'Not very effective against', types: relation(relations.half_damage_to) },
      { label: 'No effect against', types: relation(relations.no_damage_to) },
      { label: 'Weak to', types: relation(relations.double_damage_from) },
      { label: 'Resists', types: relation(relations.half_damage_from) },
      { label: 'Immune to', types: relation(relations.no_damage_from) },
    ],
    pokemon: speciesCardsByIds(
      (type.pokemon || []).map((entry) => idFromUrl(entry.pokemon?.url)),
      speciesById,
    ),
    moves: (type.moves || [])
      .map((entry) => ({
        name: entry.name,
        label: humanize(entry.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en')),
  };
}
