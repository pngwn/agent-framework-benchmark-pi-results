import { getApiBase, getJson, getJsonOrNull, idFromUrl } from "./api";
import {
  dexNumber,
  displayValue,
  englishName,
  humanize,
  kilogram,
  latestEnglishFlavor,
  metre,
} from "./format";
import type {
  Ability,
  CardData,
  Catalog,
  CatalogSpecies,
  EvolutionChain,
  EvolutionNode,
  EvolutionViewNode,
  GenerationOption,
  Move,
  MoveRowData,
  MoveTableData,
  NamedReference,
  Pokemon,
  PokemonSpecies,
  PokemonType,
  TypeOption,
  VersionGroup,
} from "./types";

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);
const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

interface ListResponse<T> {
  count: number;
  results: T[];
}

interface RawGeneration {
  id: number;
  name: string;
  names: Array<{ name: string; language: NamedReference }>;
  pokemon_species: NamedReference[];
}

interface RawVersionGroup {
  id: number;
  name: string;
  order: number;
}

let catalogPromise: Promise<Catalog> | null = null;
let versionGroupsPromise: Promise<Map<string, VersionGroup>> | null = null;

function mediaUrl(path: string): string {
  return `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

function spriteUrl(id: number): string {
  return mediaUrl(`/media/sprites/pokemon/${id}.png`);
}

export function getCatalog(): Promise<Catalog> {
  if (!catalogPromise) {
    catalogPromise = loadCatalog().catch((error) => {
      catalogPromise = null;
      throw error;
    });
  }
  return catalogPromise;
}

async function loadCatalog(): Promise<Catalog> {
  const [speciesList, typeList, generationList] = await Promise.all([
    getJson<ListResponse<NamedReference>>("/api/v2/pokemon-species/?limit=100000&offset=0"),
    getJson<ListResponse<NamedReference>>("/api/v2/type/?limit=100000&offset=0"),
    getJson<ListResponse<NamedReference>>("/api/v2/generation/?limit=100000&offset=0"),
  ]);

  const typeRefs = typeList.results.filter((entry) => !EXCLUDED_TYPES.has(entry.name));
  const [typeRecords, generationRecords] = await Promise.all([
    Promise.all(typeRefs.map((entry) => getJson<PokemonType>(entry.url))),
    Promise.all(generationList.results.map((entry) => getJson<RawGeneration>(entry.url))),
  ]);

  const types: TypeOption[] = typeRecords.map((record, index) => ({
    name: record.name,
    label: englishName(record.names, record.name),
    order: index,
  }));
  const typeLabels = new Map(types.map((type) => [type.name, type.label]));

  const generations: GenerationOption[] = generationList.results.map((entry, index) => {
    const record = generationRecords[index];
    return {
      name: entry.name,
      label: englishName(record.names, entry.name),
      order: index,
    };
  });

  const generationBySpecies = new Map<string, string>();
  for (const record of generationRecords) {
    for (const species of record.pokemon_species) {
      generationBySpecies.set(species.name, record.name);
    }
  }

  const typesByPokemonId = new Map<number, Array<{ name: string; label: string; slot: number }>>();
  for (const record of typeRecords) {
    const label = typeLabels.get(record.name) ?? humanize(record.name);
    for (const entry of record.pokemon) {
      const id = idFromUrl(entry.pokemon.url);
      if (!id || id > 10000) continue;
      const list = typesByPokemonId.get(id) ?? [];
      list.push({ name: record.name, label, slot: entry.slot });
      typesByPokemonId.set(id, list);
    }
  }
  for (const list of typesByPokemonId.values()) {
    list.sort((a, b) => a.slot - b.slot);
  }

  const species: CatalogSpecies[] = speciesList.results
    .map((entry) => {
      const id = idFromUrl(entry.url);
      return {
        id,
        name: entry.name,
        displayName: humanize(entry.name),
        generation: generationBySpecies.get(entry.name) ?? "",
        types: typesByPokemonId.get(id) ?? [],
      };
    })
    .filter((entry) => entry.id > 0)
    .sort((a, b) => a.id - b.id);

  return {
    species,
    speciesById: new Map(species.map((entry) => [entry.id, entry])),
    speciesByName: new Map(species.map((entry) => [entry.name, entry])),
    types,
    generations,
  };
}

export function getVersionGroups(): Promise<Map<string, VersionGroup>> {
  if (!versionGroupsPromise) {
    versionGroupsPromise = loadVersionGroups().catch((error) => {
      versionGroupsPromise = null;
      throw error;
    });
  }
  return versionGroupsPromise;
}

async function loadVersionGroups(): Promise<Map<string, VersionGroup>> {
  const list = await getJson<ListResponse<NamedReference>>(
    "/api/v2/version-group/?limit=100000&offset=0",
  );
  const records = await Promise.all(
    list.results.map((entry) => getJson<RawVersionGroup>(entry.url)),
  );
  const map = new Map<string, VersionGroup>();
  for (const record of records) {
    map.set(record.name, { id: record.id, name: record.name, order: record.order });
  }
  return map;
}

function catalogTypeLabel(catalog: Catalog, name: string): string {
  return catalog.types.find((type) => type.name === name)?.label ?? humanize(name);
}

function toCard(catalog: Catalog, ref: NamedReference): CardData | null {
  const id = idFromUrl(ref.url);
  if (!id || id > 10000) return null;
  const species = catalog.speciesById.get(id);
  if (species) {
    return {
      id: species.id,
      name: species.name,
      displayName: species.displayName,
      sprite: spriteUrl(species.id),
      types: species.types,
    };
  }
  return {
    id,
    name: ref.name,
    displayName: humanize(ref.name),
    sprite: spriteUrl(id),
    types: [],
  };
}

function uniqueCards(cards: Array<CardData | null>): CardData[] {
  const map = new Map<number, CardData>();
  for (const card of cards) {
    if (card && !map.has(card.id)) map.set(card.id, card);
  }
  return [...map.values()].sort((a, b) => a.id - b.id);
}

function buildEvolutionNode(node: EvolutionNode): EvolutionViewNode {
  return {
    name: node.species.name,
    displayName: humanize(node.species.name),
    children: node.evolves_to.map(buildEvolutionNode),
  };
}

function latestEnglishShortEffect(
  entries: Array<{ short_effect: string; language: NamedReference }> | undefined,
): string {
  return entries?.find((entry) => entry.language.name === "en")?.short_effect ?? "—";
}

export interface HomeParams {
  q: string;
  type: string;
  generation: string;
  page: number;
}

export interface HomeData {
  count: number;
  page: number;
  totalPages: number;
  cards: CardData[];
  types: TypeOption[];
  generations: GenerationOption[];
}

export async function loadHome(params: HomeParams): Promise<HomeData> {
  const catalog = await getCatalog();
  const query = params.q.trim().toLocaleLowerCase();
  const type = params.type.trim();
  const generation = params.generation.trim();

  const matching = catalog.species.filter((species) => {
    if (query && !species.displayName.toLocaleLowerCase().includes(query)) return false;
    if (type && !species.types.some((entry) => entry.name === type)) return false;
    if (generation && species.generation !== generation) return false;
    return true;
  });

  const totalPages = Math.ceil(matching.length / 48);
  const requestedPage = Number.isFinite(params.page) && params.page > 0 ? Math.floor(params.page) : 1;
  const page = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;
  const cards = matching.slice((page - 1) * 48, page * 48).map((species) => ({
    id: species.id,
    name: species.name,
    displayName: species.displayName,
    sprite: spriteUrl(species.id),
    types: species.types,
  }));

  return {
    count: matching.length,
    page,
    totalPages,
    cards,
    types: catalog.types,
    generations: catalog.generations,
  };
}

export interface PokemonPageData {
  id: number;
  number: string;
  name: string;
  displayName: string;
  genus: string;
  flavor: string;
  types: Array<{ name: string; label: string }>;
  artwork: string | null;
  height: string;
  weight: string;
  stats: Array<{ label: string; value: number }>;
  statTotal: number;
  abilities: Array<{ name: string; displayName: string; hidden: boolean }>;
  evolution: EvolutionViewNode[];
  games: Array<{ name: string; label: string }>;
  selectedGame: string | null;
  moveTables: MoveTableData[];
}

export async function loadPokemonPage(
  name: string,
  requestedGame: string,
): Promise<PokemonPageData | null> {
  const [species, catalog, versionGroups] = await Promise.all([
    getJsonOrNull<PokemonSpecies>(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`),
    getCatalog(),
    getVersionGroups(),
  ]);
  if (!species) return null;

  const defaultVariety =
    species.varieties.find((variety) => variety.is_default) ?? species.varieties[0];
  if (!defaultVariety) return null;

  const pokemon = await getJsonOrNull<Pokemon>(defaultVariety.pokemon.url);
  if (!pokemon) return null;

  const evolutionChain = species.evolution_chain
    ? await getJsonOrNull<EvolutionChain>(species.evolution_chain.url)
    : null;

  const availableGroupNames = new Set<string>();
  for (const moveEntry of pokemon.moves) {
    for (const detail of moveEntry.version_group_details) {
      availableGroupNames.add(detail.version_group.name);
    }
  }
  const games = [...availableGroupNames]
    .map((groupName) => {
      const group = versionGroups.get(groupName);
      return {
        name: groupName,
        label: humanize(groupName),
        order: group?.order ?? 0,
      };
    })
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

  const selectedGame =
    requestedGame && games.some((game) => game.name === requestedGame)
      ? requestedGame
      : games.length
        ? games[games.length - 1].name
        : null;

  const moveSeeds: Array<{
    method: string;
    level: number;
    moveName: string;
    moveUrl: string;
  }> = [];

  if (selectedGame) {
    for (const moveEntry of pokemon.moves) {
      for (const detail of moveEntry.version_group_details) {
        if (detail.version_group.name !== selectedGame) continue;
        moveSeeds.push({
          method: detail.move_learn_method.name,
          level: detail.level_learned_at,
          moveName: moveEntry.move.name,
          moveUrl: moveEntry.move.url,
        });
      }
    }
  }

  const moveUrls = new Map<string, string>();
  for (const seed of moveSeeds) moveUrls.set(seed.moveName, seed.moveUrl);
  const moveRecords = await Promise.all(
    [...moveUrls.values()].map((url) => getJsonOrNull<Move>(url)),
  );
  const movesByName = new Map<string, Move>();
  for (const move of moveRecords) {
    if (move) movesByName.set(move.name, move);
  }

  const rows: MoveRowData[] = moveSeeds.map((seed) => {
    const move = movesByName.get(seed.moveName);
    return {
      method: seed.method,
      level: seed.level,
      moveName: move ? englishName(move.names, move.name) : humanize(seed.moveName),
      moveApiName: seed.moveName,
      typeName: move?.type?.name ?? "",
      typeLabel: move?.type?.name ? catalogTypeLabel(catalog, move.type.name) : "—",
      category: move?.damage_class?.name ? humanize(move.damage_class.name) : "—",
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    };
  });

  const methodNames = [...new Set(rows.map((row) => row.method))];
  const fixedOrder = ["level-up", "machine", "egg", "tutor"];
  methodNames.sort((a, b) => {
    const aIndex = fixedOrder.indexOf(a);
    const bIndex = fixedOrder.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return humanize(a).localeCompare(humanize(b));
  });

  const moveTables: MoveTableData[] = methodNames.map((method) => ({
    name: method,
    label: humanize(method),
    rows: rows.filter((row) => row.method === method),
  }));

  const types = [...pokemon.types]
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => ({
      name: entry.type.name,
      label: catalogTypeLabel(catalog, entry.type.name),
    }));

  const abilities = [...pokemon.abilities]
    .sort((a, b) => a.slot - b.slot)
    .filter((entry) => entry.ability)
    .map((entry) => ({
      name: entry.ability!.name,
      displayName: humanize(entry.ability!.name),
      hidden: entry.is_hidden,
    }));

  const stats = pokemon.stats.map((entry) => ({
    label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
    value: entry.base_stat,
  }));

  const evolution = evolutionChain
    ? [buildEvolutionNode(evolutionChain.chain)]
    : [
        {
          name: species.name,
          displayName: humanize(species.name),
          children: [],
        },
      ];

  return {
    id: species.id,
    number: dexNumber(species.id),
    name: species.name,
    displayName: englishName(species.names, species.name),
    genus:
      species.genera.find((entry) => entry.language.name === "en")?.genus ?? "—",
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    types,
    artwork:
      pokemon.sprites.other?.["official-artwork"]?.front_default ??
      pokemon.sprites.front_default,
    height: metre(pokemon.height),
    weight: kilogram(pokemon.weight),
    stats,
    statTotal: stats.reduce((total, stat) => total + stat.value, 0),
    abilities,
    evolution,
    games: games.map((game) => ({ name: game.name, label: game.label })),
    selectedGame,
    moveTables,
  };
}

export interface MovePageData {
  name: string;
  displayName: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string;
  cards: CardData[];
}

export async function loadMovePage(name: string): Promise<MovePageData | null> {
  const [move, catalog] = await Promise.all([
    getJsonOrNull<Move>(`/api/v2/move/${encodeURIComponent(name)}/`),
    getCatalog(),
  ]);
  if (!move) return null;

  const shortEffect = move.effect_entries.find(
    (entry) => entry.language.name === "en",
  )?.short_effect;
  const effect = shortEffect ?? latestEnglishFlavor(move.flavor_text_entries);

  return {
    name: move.name,
    displayName: englishName(move.names, move.name),
    typeName: move.type.name,
    typeLabel: catalogTypeLabel(catalog, move.type.name),
    category: move.damage_class?.name ? humanize(move.damage_class.name) : "—",
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect,
    cards: uniqueCards(move.learned_by_pokemon.map((ref) => toCard(catalog, ref))),
  };
}

export interface AbilityPageData {
  name: string;
  displayName: string;
  effect: string;
  cards: CardData[];
}

export async function loadAbilityPage(name: string): Promise<AbilityPageData | null> {
  const [ability, catalog] = await Promise.all([
    getJsonOrNull<Ability>(`/api/v2/ability/${encodeURIComponent(name)}/`),
    getCatalog(),
  ]);
  if (!ability) return null;

  const cards = new Map<number, CardData>();
  for (const entry of ability.pokemon) {
    const card = toCard(catalog, entry.pokemon);
    if (!card) continue;
    const existing = cards.get(card.id);
    if (existing) {
      if (entry.is_hidden) existing.hidden = true;
    } else {
      cards.set(card.id, { ...card, hidden: entry.is_hidden });
    }
  }

  return {
    name: ability.name,
    displayName: englishName(ability.names, ability.name),
    effect: latestEnglishShortEffect(ability.effect_entries),
    cards: [...cards.values()].sort((a, b) => a.id - b.id),
  };
}

export interface TypePageData {
  name: string;
  displayName: string;
  damageRelations: Array<{ term: string; types: Array<{ name: string; label: string }> }>;
  cards: CardData[];
  moves: Array<{ name: string; label: string }>;
}

export async function loadTypePage(name: string): Promise<TypePageData | null> {
  const [type, catalog] = await Promise.all([
    getJsonOrNull<PokemonType>(`/api/v2/type/${encodeURIComponent(name)}/`),
    getCatalog(),
  ]);
  if (!type) return null;
  if (EXCLUDED_TYPES.has(type.name)) return null;
  if (!catalog.types.some((entry) => entry.name === type.name)) return null;

  const relations = type.damage_relations;
  const relationEntries: Array<[string, NamedReference[]]> = [
    ["Super effective against", relations.double_damage_to],
    ["Not very effective against", relations.half_damage_to],
    ["No effect against", relations.no_damage_to],
    ["Weak to", relations.double_damage_from],
    ["Resists", relations.half_damage_from],
    ["Immune to", relations.no_damage_from],
  ];

  return {
    name: type.name,
    displayName: englishName(type.names, type.name),
    damageRelations: relationEntries.map(([term, entries]) => ({
      term,
      types: entries.map((entry) => ({
        name: entry.name,
        label: catalogTypeLabel(catalog, entry.name),
      })),
    })),
    cards: uniqueCards(type.pokemon.map((entry) => toCard(catalog, entry.pokemon))),
    moves: type.moves
      .map((move) => ({ name: move.name, label: humanize(move.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export async function loadTypeList() {
  const catalog = await getCatalog();
  return catalog.types.map((type) => ({ name: type.name, label: type.label }));
}

export function missingValue(value: number | null): string | number {
  return displayValue(value);
}
