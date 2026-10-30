"use server";

const API_BASE = (
  (typeof process !== "undefined" && process.env && process.env.API_BASE_URL) ||
  "http://localhost:9000"
).replace(/\/+$/, "");

const recordCache = new Map();
const listCache = new Map();

class ApiNotFound extends Error {}

function idFromUrl(url) {
  const match = typeof url === "string" ? url.match(/\/(\d+)\/?$/) : null;
  return match ? Number(match[1]) : null;
}

function humanize(name) {
  if (!name) return "";
  return String(name)
    .split("-")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function englishName(entries) {
  return entries?.find((entry) => entry.language?.name === "en")?.name;
}

function englishText(entries, key) {
  return entries?.find((entry) => entry.language?.name === "en")?.[key];
}

function latestEnglishFlavor(entries) {
  if (!Array.isArray(entries)) return null;
  const entry = [...entries].reverse().find((item) => item.language?.name === "en");
  return entry ? collapseWhitespace(entry.flavor_text) : null;
}

function collapseWhitespace(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function dexNumber(id) {
  return `#${String(id).padStart(4, "0")}`;
}

function compareText(a, b) {
  return String(a).localeCompare(String(b));
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (response.status === 404) throw new ApiNotFound(path);
  if (!response.ok) throw new Error(`API request failed: ${path} (${response.status})`);
  return response.json();
}

function memoRecord(resource, key) {
  const cacheKey = `${resource}:${key}`;
  if (!recordCache.has(cacheKey)) {
    const promise = fetchJson(`/api/v2/${resource}/${encodeURIComponent(key)}/`).catch((error) => {
      recordCache.delete(cacheKey);
      throw error;
    });
    recordCache.set(cacheKey, promise);
  }
  return recordCache.get(cacheKey);
}

function memoList(resource) {
  if (!listCache.has(resource)) {
    const promise = fetchJson(`/api/v2/${resource}/?limit=100000`).catch((error) => {
      listCache.delete(resource);
      throw error;
    });
    listCache.set(resource, promise);
  }
  return listCache.get(resource);
}

const CORE_TYPES = new Set([
  "normal", "fighting", "flying", "poison", "ground", "rock", "bug", "ghost",
  "steel", "fire", "water", "grass", "electric", "psychic", "ice", "dragon",
  "dark", "fairy",
]);

let coreTypesPromise;
function getCoreTypes() {
  if (!coreTypesPromise) {
    coreTypesPromise = (async () => {
      const list = await memoList("type");
      const records = await Promise.all(
        list.results
          .filter((entry) => CORE_TYPES.has(entry.name))
          .map((entry) => memoRecord("type", entry.name)),
      );
      return records.map((record) => ({
        name: record.name,
        label: englishName(record.names) ?? humanize(record.name),
        record,
      }));
    })().catch((error) => {
      coreTypesPromise = undefined;
      throw error;
    });
  }
  return coreTypesPromise;
}

let generationsPromise;
function getGenerations() {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const list = await memoList("generation");
      const records = await Promise.all(
        list.results.map((entry) => memoRecord("generation", entry.name)),
      );
      return records.map((record) => ({
        name: record.name,
        label: englishName(record.names) ?? humanize(record.name),
        record,
      }));
    })().catch((error) => {
      generationsPromise = undefined;
      throw error;
    });
  }
  return generationsPromise;
}

let listDataPromise;
function getListData() {
  if (!listDataPromise) {
    listDataPromise = (async () => {
      const [speciesList, coreTypes, generations] = await Promise.all([
        memoList("pokemon-species"),
        getCoreTypes(),
        getGenerations(),
      ]);

      const typeLabels = new Map(coreTypes.map((type) => [type.name, type.label]));
      const typesByPokemon = new Map();
      for (const type of coreTypes) {
        for (const entry of type.record.pokemon ?? []) {
          const id = idFromUrl(entry.pokemon?.url);
          if (!id || id > 10000) continue;
          if (!typesByPokemon.has(id)) typesByPokemon.set(id, []);
          typesByPokemon.get(id).push({
            name: type.name,
            label: type.label,
            slot: entry.slot ?? 0,
          });
        }
      }

      const generationBySpecies = new Map();
      for (const generation of generations) {
        for (const species of generation.record.pokemon_species ?? []) {
          const id = idFromUrl(species.url);
          if (id) generationBySpecies.set(id, generation.name);
        }
      }

      const species = speciesList.results
        .map((entry) => {
          const id = idFromUrl(entry.url);
          if (!id) return null;
          const types = (typesByPokemon.get(id) ?? []).sort((a, b) => a.slot - b.slot);
          return {
            id,
            name: entry.name,
            displayName: humanize(entry.name),
            dex: dexNumber(id),
            sprite: `${API_BASE}/media/sprites/pokemon/${id}.png`,
            types,
            generation: generationBySpecies.get(id) ?? null,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.id - b.id);

      return {
        species,
        types: coreTypes.map(({ name, label }) => ({ name, label })),
        generations: generations.map(({ name, label }) => ({ name, label })),
      };
    })().catch((error) => {
      listDataPromise = undefined;
      throw error;
    });
  }
  return listDataPromise;
}

async function pokemonReference(ref) {
  if (!ref) return null;
  try {
    return await memoRecord("pokemon", ref.name ?? idFromUrl(ref.url));
  } catch (error) {
    if (error instanceof ApiNotFound) return null;
    throw error;
  }
}

const STAT_LABELS = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const DAMAGE_CLASS_LABELS = {
  physical: "Physical",
  special: "Special",
  status: "Status",
};

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

function methodRank(method) {
  const index = METHOD_ORDER.indexOf(method);
  return index === -1 ? METHOD_ORDER.length : index;
}

function moveRow(entry, record, typeLabels) {
  return {
    level: entry.level > 0 ? entry.level : entry.level === 0 ? "0" : "—",
    move: englishName(record.names) ?? humanize(record.name ?? entry.name),
    moveHref: `/moves/${record.name ?? entry.name}`,
    type: typeLabels.get(record.type?.name) ?? humanize(record.type?.name),
    typeName: record.type?.name ?? "",
    category: DAMAGE_CLASS_LABELS[record.damage_class?.name] ?? humanize(record.damage_class?.name),
    power: record.power ?? "—",
    accuracy: record.accuracy ?? "—",
    pp: record.pp ?? "—",
  };
}

function sortDefaultRows(rows, method) {
  return [...rows].sort((a, b) => {
    if (method === "level-up") {
      const levelCompare = Number(a.level) - Number(b.level);
      if (levelCompare) return levelCompare;
    }
    return compareText(a.move, b.move);
  });
}

async function getPokemonPageData(name) {
  let species;
  try {
    species = await memoRecord("pokemon-species", name);
  } catch (error) {
    if (error instanceof ApiNotFound) return { notFound: true };
    throw error;
  }

  const defaultVariety =
    species.varieties?.find((variety) => variety.is_default)?.pokemon ??
    species.varieties?.[0]?.pokemon ?? { name: species.name };
  const pokemon = await pokemonReference(defaultVariety);
  if (!pokemon) return { notFound: true };

  const [coreTypes, evolutionChain] = await Promise.all([
    getCoreTypes(),
    (async () => {
      const chainId = idFromUrl(species.evolution_chain?.url);
      if (!chainId) return null;
      try {
        return await memoRecord("evolution-chain", String(chainId));
      } catch (error) {
        if (error instanceof ApiNotFound) return null;
        throw error;
      }
    })(),
  ]);

  const typeLabels = new Map(coreTypes.map((type) => [type.name, type.label]));

  const stats = (pokemon.stats ?? []).map((stat) => ({
    label: STAT_LABELS[stat.stat?.name] ?? humanize(stat.stat?.name),
    value: stat.base_stat,
  }));
  const statTotal = stats.reduce((sum, stat) => sum + (Number(stat.value) || 0), 0);

  const abilities = [...(pokemon.abilities ?? [])]
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((entry) => ({
      name: entry.ability?.name,
      label: humanize(entry.ability?.name),
      hidden: Boolean(entry.is_hidden),
      href: `/abilities/${entry.ability?.name}`,
    }))
    .filter((entry) => entry.name);

  const evolution = evolutionChain?.chain
    ? mapEvolutionNode(evolutionChain.chain)
    : null;

  const versionGroups = new Map();
  const moveNames = new Set();
  for (const moveEntry of pokemon.moves ?? []) {
    if (!moveEntry.move?.name) continue;
    moveNames.add(moveEntry.move.name);
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail.version_group?.name) versionGroups.set(detail.version_group.name, detail.version_group);
    }
  }

  const [versionGroupRecords, moveRecords] = await Promise.all([
    Promise.all(
      [...versionGroups.values()].map(async (ref) => {
        try {
          return await memoRecord("version-group", ref.name);
        } catch (error) {
          if (error instanceof ApiNotFound) return null;
          throw error;
        }
      }),
    ),
    Promise.all(
      [...moveNames].map(async (moveName) => {
        try {
          return await memoRecord("move", moveName);
        } catch (error) {
          if (error instanceof ApiNotFound) return null;
          throw error;
        }
      }),
    ),
  ]);

  const movesByName = new Map();
  for (const record of moveRecords) {
    if (record?.name) movesByName.set(record.name, record);
  }

  const games = versionGroupRecords
    .filter(Boolean)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((record) => ({
      name: record.name,
      label: humanize(record.name),
      order: record.order ?? 0,
    }));

  const tablesByGame = {};
  for (const game of games) {
    const methodRows = new Map();
    for (const moveEntry of pokemon.moves ?? []) {
      const record = movesByName.get(moveEntry.move?.name);
      if (!record) continue;
      for (const detail of moveEntry.version_group_details ?? []) {
        if (detail.version_group?.name !== game.name) continue;
        const method = detail.move_learn_method?.name;
        if (!method) continue;
        if (!methodRows.has(method)) methodRows.set(method, []);
        methodRows.get(method).push(
          moveRow(
            {
              name: moveEntry.move.name,
              level: detail.level_learned_at ?? 0,
            },
            record,
            typeLabels,
          ),
        );
      }
    }

    const tables = [...methodRows.entries()]
      .map(([method, rows]) => ({
        method,
        label: humanize(method),
        rows: sortDefaultRows(rows, method),
      }))
      .sort((a, b) => {
        const aRank = methodRank(a.method);
        const bRank = methodRank(b.method);
        const aKnown = aRank < METHOD_ORDER.length;
        const bKnown = bRank < METHOD_ORDER.length;
        if (aKnown && bKnown) return aRank - bRank;
        if (aKnown) return -1;
        if (bKnown) return 1;
        return compareText(a.label, b.label);
      });

    tablesByGame[game.name] = tables;
  }

  const english = englishName(species.names) ?? humanize(species.name);
  const artwork =
    pokemon.sprites?.other?.["official-artwork"]?.front_default ??
    pokemon.sprites?.other?.home?.front_default ??
    pokemon.sprites?.front_default ??
    null;

  return {
    id: species.id,
    name: species.name,
    englishName: english,
    humanizedName: humanize(species.name),
    dex: dexNumber(species.id),
    genus: englishText(species.genera, "genus") ?? "—",
    flavorText: latestEnglishFlavor(species.flavor_text_entries) ?? "—",
    artwork,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    types: [...(pokemon.types ?? [])]
      .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
      .map((entry) => ({
        name: entry.type?.name,
        label: typeLabels.get(entry.type?.name) ?? humanize(entry.type?.name),
      }))
      .filter((entry) => entry.name),
    stats: [...stats, { label: "Total", value: statTotal }],
    abilities,
    evolution,
    games,
    defaultGame: games.length ? games[games.length - 1].name : null,
    tablesByGame,
  };
}

function mapEvolutionNode(node) {
  return {
    name: node.species?.name,
    label: humanize(node.species?.name),
    evolvesTo: (node.evolves_to ?? []).map(mapEvolutionNode),
  };
}

function speciesCard(species, extra = {}) {
  return {
    id: species.id,
    name: species.name,
    displayName: species.displayName,
    dex: species.dex,
    sprite: species.sprite,
    ...extra,
  };
}

function speciesFromId(listData, id) {
  return listData.species.find((species) => species.id === id) ?? null;
}

function speciesCardsForPokemonRefs(listData, refs) {
  const cards = new Map();
  for (const ref of refs ?? []) {
    const id = idFromUrl(ref.pokemon?.url ?? ref.url);
    if (!id || id > 10000) continue;
    const species = speciesFromId(listData, id);
    if (!species || cards.has(species.id)) continue;
    cards.set(species.id, speciesCard(species));
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}

async function getMovePageData(name) {
  let move;
  try {
    move = await memoRecord("move", name);
  } catch (error) {
    if (error instanceof ApiNotFound) return { notFound: true };
    throw error;
  }

  const [coreTypes, listData] = await Promise.all([getCoreTypes(), getListData()]);
  const typeLabels = new Map(coreTypes.map((type) => [type.name, type.label]));
  const english = englishName(move.names) ?? humanize(move.name);

  const effect =
    englishText(move.effect_entries, "short_effect") ??
    latestEnglishFlavor(move.flavor_text_entries) ??
    "—";

  return {
    name: move.name,
    englishName: english,
    type: {
      name: move.type?.name,
      label: typeLabels.get(move.type?.name) ?? humanize(move.type?.name),
    },
    category: DAMAGE_CLASS_LABELS[move.damage_class?.name] ?? humanize(move.damage_class?.name),
    power: move.power ?? "—",
    accuracy: move.accuracy ?? "—",
    pp: move.pp ?? "—",
    effect,
    learnedBy: speciesCardsForPokemonRefs(listData, move.learned_by_pokemon),
  };
}

async function getAbilityPageData(name) {
  let ability;
  try {
    ability = await memoRecord("ability", name);
  } catch (error) {
    if (error instanceof ApiNotFound) return { notFound: true };
    throw error;
  }

  const listData = await getListData();
  const byId = new Map();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url);
    if (!id || id > 10000) continue;
    const species = speciesFromId(listData, id);
    if (!species) continue;
    const existing = byId.get(species.id);
    if (existing) {
      existing.hidden = existing.hidden || Boolean(entry.is_hidden);
    } else {
      byId.set(species.id, speciesCard(species, { hidden: Boolean(entry.is_hidden) }));
    }
  }

  return {
    name: ability.name,
    englishName: englishName(ability.names) ?? humanize(ability.name),
    effect: englishText(ability.effect_entries, "short_effect") ?? "—",
    pokemon: [...byId.values()].sort((a, b) => a.id - b.id),
  };
}

async function getTypesPageData() {
  const coreTypes = await getCoreTypes();
  return {
    types: coreTypes.map(({ name, label }) => ({ name, label })),
  };
}

async function getTypePageData(name) {
  let type;
  try {
    type = await memoRecord("type", name);
  } catch (error) {
    if (error instanceof ApiNotFound) return { notFound: true };
    throw error;
  }

  if (!CORE_TYPES.has(type.name)) return { notFound: true };

  const [coreTypes, listData] = await Promise.all([getCoreTypes(), getListData()]);
  const typeLabels = new Map(coreTypes.map((item) => [item.name, item.label]));
  const relations = type.damage_relations ?? {};

  const relation = (key) =>
    [...(relations[key] ?? [])]
      .map((item) => ({
        name: item.name,
        label: typeLabels.get(item.name) ?? humanize(item.name),
      }))
      .sort((a, b) => compareText(a.label, b.label));

  const pokemon = speciesCardsForPokemonRefs(listData, type.pokemon);

  return {
    name: type.name,
    englishName: englishName(type.names) ?? humanize(type.name),
    relations: {
      superEffective: relation("double_damage_to"),
      notVeryEffective: relation("half_damage_to"),
      noEffect: relation("no_damage_to"),
      weakTo: relation("double_damage_from"),
      resists: relation("half_damage_from"),
      immuneTo: relation("no_damage_from"),
    },
    pokemon,
    moves: [...(type.moves ?? [])]
      .map((item) => ({ name: item.name, label: humanize(item.name) }))
      .sort((a, b) => compareText(a.name, b.name)),
  };
}

// Exported server functions -------------------------------------------------

export async function loadHomeData() {
  return getListData();
}

export async function loadPokemonPage(name) {
  return getPokemonPageData(String(name ?? "").toLowerCase());
}

export async function loadMovePage(name) {
  return getMovePageData(String(name ?? "").toLowerCase());
}

export async function loadAbilityPage(name) {
  return getAbilityPageData(String(name ?? "").toLowerCase());
}

export async function loadTypesPage() {
  return getTypesPageData();
}

export async function loadTypePage(name) {
  return getTypePageData(String(name ?? "").toLowerCase());
}
