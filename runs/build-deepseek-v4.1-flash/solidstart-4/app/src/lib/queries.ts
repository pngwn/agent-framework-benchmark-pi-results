import { query } from "@solidjs/router";
import {
  collapseWhitespace,
  englishName,
  humanize,
  latestEnglishFlavor,
  statLabel,
} from "./format";

type NamedRef = { name: string; url: string };

interface SpeciesRecord {
  id: number;
  name: string;
  label: string;
}

export interface TypeRef {
  name: string;
  label: string;
  slot: number;
}

export interface CardSpecies {
  id: number;
  name: string;
  label: string;
  sprite: string;
}

export interface SpeciesSummary extends CardSpecies {
  types: TypeRef[];
  generation: string;
}

interface TypeOption {
  name: string;
  label: string;
}

interface GenerationOption {
  name: string;
  label: string;
  order: number;
}

interface HomeData {
  species: SpeciesSummary[];
  types: TypeOption[];
  generations: GenerationOption[];
}

export interface MoveRowData {
  moveName: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  categoryName: string;
  categoryLabel: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  level: number | null;
}

export interface MoveTableData {
  method: string;
  label: string;
  columns: { key: string; label: string }[];
  rows: MoveRowData[];
}

export interface PokemonPageData {
  id: number;
  name: string;
  englishName: string;
  genus: string;
  types: TypeRef[];
  artwork: string | null;
  height: number;
  weight: number;
  flavorText: string;
  stats: { name: string; label: string; value: number }[];
  total: number;
  abilities: { name: string; label: string; hidden: boolean; slot: number }[];
  evolution: EvolutionNode;
  gameOptions: GenerationOption[];
  selectedGame: string;
  tables: MoveTableData[];
}

export interface EvolutionNode {
  name: string;
  label: string;
  children: EvolutionNode[];
}

export interface MovePageData {
  id: number;
  name: string;
  englishName: string;
  type: { name: string; label: string };
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string;
  pokemon: CardSpecies[];
}

export interface AbilityPageData {
  id: number;
  name: string;
  englishName: string;
  effect: string;
  pokemon: (CardSpecies & { hidden: boolean })[];
}

export interface TypePageData {
  id: number;
  name: string;
  englishName: string;
  relations: { key: string; label: string; types: { name: string; label: string }[] }[];
  pokemon: CardSpecies[];
  moves: { name: string; label: string }[];
}

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

const jsonCache = new Map<string, Promise<any>>();

function apiBase(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env ? process.env.API_BASE_URL : undefined;
  return (fromEnv || "http://localhost:9000").replace(/\/+$/, "");
}

function pathFromUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    return `${url.pathname}${url.search}`;
  }
  return value;
}

function apiUrl(value: string): string {
  const path = pathFromUrl(value);
  return `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

function mediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return apiUrl(value);
}

async function fetchJson(value: string): Promise<any | null> {
  const url = apiUrl(value);
  const cached = jsonCache.get(url);
  if (cached) return cached;

  const promise = fetch(url, { headers: { Accept: "application/json" } })
    .then(async (response) => {
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`PokeAPI request failed (${response.status}): ${url}`);
      }
      return response.json();
    })
    .catch((error) => {
      jsonCache.delete(url);
      throw error;
    });

  jsonCache.set(url, promise);
  return promise;
}

function refId(refOrUrl: NamedRef | string | null | undefined): number {
  if (!refOrUrl) return 0;
  const value = typeof refOrUrl === "string" ? refOrUrl : refOrUrl.url;
  return Number(value?.match(/\/(\d+)\/?$/)?.[1] ?? 0);
}

function spriteForId(id: number): string {
  return `${apiBase()}/media/sprites/pokemon/${id}.png`;
}

function cardSpecies(species: SpeciesRecord): CardSpecies {
  return {
    id: species.id,
    name: species.name,
    label: species.label,
    sprite: spriteForId(species.id),
  };
}

interface SpeciesDirectory {
  list: SpeciesRecord[];
  byId: Map<number, SpeciesRecord>;
}

let speciesDirectoryPromise: Promise<SpeciesDirectory> | undefined;

function buildSpeciesDirectory(): Promise<SpeciesDirectory> {
  if (!speciesDirectoryPromise) {
    speciesDirectoryPromise = (async () => {
      const data = await fetchJson("/api/v2/pokemon-species?limit=100000");
      const list: SpeciesRecord[] = (data?.results ?? [])
        .map((entry: NamedRef) => {
          const id = refId(entry.url);
          return id ? { id, name: entry.name, label: humanize(entry.name) } : null;
        })
        .filter(Boolean)
        .sort((a: SpeciesRecord, b: SpeciesRecord) => a.id - b.id);
      const byId = new Map<number, SpeciesRecord>(list.map((entry) => [entry.id, entry]));
      return { list, byId };
    })().catch((error) => {
      speciesDirectoryPromise = undefined;
      throw error;
    });
  }
  return speciesDirectoryPromise;
}

interface GenerationData {
  list: GenerationOption[];
  bySpecies: Map<number, string>;
}

let generationPromise: Promise<GenerationData> | undefined;

function buildGenerations(): Promise<GenerationData> {
  if (!generationPromise) {
    generationPromise = (async () => {
      const index = await fetchJson("/api/v2/generation?limit=100000");
      const records = await Promise.all(
        (index?.results ?? []).map((entry: NamedRef) => fetchJson(pathFromUrl(entry.url))),
      );
      const list: GenerationOption[] = [];
      const bySpecies = new Map<number, string>();

      for (const record of records) {
        if (!record) continue;
        list.push({
          name: record.name,
          label: englishName(record.names) || humanize(record.name),
          order: Number(record.id),
        });
        for (const species of record.pokemon_species ?? []) {
          const id = refId(species.url);
          if (id) bySpecies.set(id, record.name);
        }
      }

      list.sort((a, b) => a.order - b.order);
      return { list, bySpecies };
    })().catch((error) => {
      generationPromise = undefined;
      throw error;
    });
  }
  return generationPromise;
}

interface TypeData {
  list: TypeOption[];
  bySpecies: Map<number, TypeRef[]>;
}

let typeDataPromise: Promise<TypeData> | undefined;

function buildTypes(): Promise<TypeData> {
  if (!typeDataPromise) {
    typeDataPromise = (async () => {
      const index = await fetchJson("/api/v2/type?limit=100000");
      const refs = (index?.results ?? []).filter(
        (entry: NamedRef) => !EXCLUDED_TYPES.has(entry.name),
      );
      const records = await Promise.all(
        refs.map((entry: NamedRef) => fetchJson(pathFromUrl(entry.url))),
      );
      const list: TypeOption[] = [];
      const membership = new Map<number, Map<string, TypeRef>>();

      for (const record of records) {
        if (!record) continue;
        const label = englishName(record.names) || humanize(record.name);
        list.push({ name: record.name, label });

        for (const entry of record.pokemon ?? []) {
          const id = refId(entry.pokemon?.url);
          if (!id || id > 10000) continue;
          const slot = Number(entry.slot) || 1;
          let perSpecies = membership.get(id);
          if (!perSpecies) {
            perSpecies = new Map();
            membership.set(id, perSpecies);
          }
          const existing = perSpecies.get(record.name);
          if (!existing || slot < existing.slot) {
            perSpecies.set(record.name, { name: record.name, label, slot });
          }
        }
      }

      const bySpecies = new Map<number, TypeRef[]>();
      for (const [id, types] of membership) {
        bySpecies.set(
          id,
          [...types.values()].sort((a, b) => a.slot - b.slot || a.name.localeCompare(b.name)),
        );
      }
      return { list, bySpecies };
    })().catch((error) => {
      typeDataPromise = undefined;
      throw error;
    });
  }
  return typeDataPromise;
}

let homePromise: Promise<HomeData> | undefined;

function buildHomeData(): Promise<HomeData> {
  if (!homePromise) {
    homePromise = (async () => {
      const directory = await buildSpeciesDirectory();
      const [generations, types] = await Promise.all([buildGenerations(), buildTypes()]);
      const species: SpeciesSummary[] = directory.list.map((entry) => ({
        ...cardSpecies(entry),
        types: types.bySpecies.get(entry.id) ?? [],
        generation: generations.bySpecies.get(entry.id) ?? "",
      }));
      return {
        species,
        types: types.list,
        generations: generations.list,
      };
    })().catch((error) => {
      homePromise = undefined;
      throw error;
    });
  }
  return homePromise;
}

export const getHomeData = query(async (): Promise<HomeData> => {
  "use server";
  return buildHomeData();
}, "home-data");

export const getTypeListData = query(async () => {
  "use server";
  const types = await buildTypes();
  return { types: types.list };
}, "type-list");

export const getTypePageData = query(async (name: string): Promise<TypePageData | null> => {
  "use server";
  const type = await fetchJson(`/api/v2/type/${encodeURIComponent(name)}`);
  if (!type) return null;

  const directory = await buildSpeciesDirectory();
  const pokemonById = new Map<number, CardSpecies>();
  for (const entry of type.pokemon ?? []) {
    const id = refId(entry.pokemon?.url);
    if (!id || id > 10000) continue;
    const species = directory.byId.get(id);
    if (species && !pokemonById.has(id)) pokemonById.set(id, cardSpecies(species));
  }
  const pokemon = [...pokemonById.values()].sort((a, b) => a.id - b.id);

  const moveByName = new Map<string, { name: string; label: string }>();
  for (const entry of type.moves ?? []) {
    if (!moveByName.has(entry.name)) {
      moveByName.set(entry.name, { name: entry.name, label: humanize(entry.name) });
    }
  }
  const moves = [...moveByName.values()].sort((a, b) => a.label.localeCompare(b.label));

  const relationKeys = [
    ["double_damage_to", "Super effective against"],
    ["half_damage_to", "Not very effective against"],
    ["no_damage_to", "No effect against"],
    ["double_damage_from", "Weak to"],
    ["half_damage_from", "Resists"],
    ["no_damage_from", "Immune to"],
  ] as const;

  return {
    id: type.id,
    name: type.name,
    englishName: englishName(type.names) || humanize(type.name),
    relations: relationKeys.map(([key, label]) => ({
      key,
      label,
      types: (type.damage_relations?.[key] ?? []).map((entry: NamedRef) => ({
        name: entry.name,
        label: humanize(entry.name),
      })),
    })),
    pokemon,
    moves,
  };
}, "type-page");

export const getMovePageData = query(async (name: string): Promise<MovePageData | null> => {
  "use server";
  const move = await fetchJson(`/api/v2/move/${encodeURIComponent(name)}`);
  if (!move) return null;

  const directory = await buildSpeciesDirectory();
  const pokemonById = new Map<number, CardSpecies>();
  for (const entry of move.learned_by_pokemon ?? []) {
    const id = refId(entry.url);
    if (!id || id > 10000) continue;
    const species = directory.byId.get(id);
    if (species && !pokemonById.has(id)) pokemonById.set(id, cardSpecies(species));
  }
  const pokemon = [...pokemonById.values()].sort((a, b) => a.id - b.id);

  const englishEffect = (
    move.effect_entries as { short_effect: string; language: { name: string } }[] | undefined
  )?.find((entry) => entry.language?.name === "en")?.short_effect;
  const effect =
    collapseWhitespace(englishEffect) ||
    collapseWhitespace(latestEnglishFlavor(move.flavor_text_entries)) ||
    "—";

  return {
    id: move.id,
    name: move.name,
    englishName: englishName(move.names) || humanize(move.name),
    type: { name: move.type?.name ?? "", label: humanize(move.type?.name) },
    category: humanize(move.damage_class?.name),
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    pokemon,
  };
}, "move-page");

export const getAbilityPageData = query(async (name: string): Promise<AbilityPageData | null> => {
  "use server";
  const ability = await fetchJson(`/api/v2/ability/${encodeURIComponent(name)}`);
  if (!ability) return null;

  const directory = await buildSpeciesDirectory();
  const pokemonById = new Map<number, CardSpecies & { hidden: boolean }>();
  for (const entry of ability.pokemon ?? []) {
    const id = refId(entry.pokemon?.url);
    if (!id || id > 10000) continue;
    const species = directory.byId.get(id);
    if (!species) continue;
    const existing = pokemonById.get(id);
    if (existing) {
      if (entry.is_hidden) existing.hidden = true;
    } else {
      pokemonById.set(id, { ...cardSpecies(species), hidden: Boolean(entry.is_hidden) });
    }
  }
  const pokemon = [...pokemonById.values()].sort((a, b) => a.id - b.id);

  const englishEffect = (
    ability.effect_entries as { short_effect: string; language: { name: string } }[] | undefined
  )?.find((entry) => entry.language?.name === "en")?.short_effect;
  const effect =
    collapseWhitespace(englishEffect) ||
    collapseWhitespace(latestEnglishFlavor(ability.flavor_text_entries)) ||
    "—";

  return {
    id: ability.id,
    name: ability.name,
    englishName: englishName(ability.names) || humanize(ability.name),
    effect,
    pokemon,
  };
}, "ability-page");

let versionGroupsPromise: Promise<Map<string, any>> | undefined;

function buildVersionGroups(): Promise<Map<string, any>> {
  if (!versionGroupsPromise) {
    versionGroupsPromise = (async () => {
      const index = await fetchJson("/api/v2/version-group?limit=100000");
      const records = await Promise.all(
        (index?.results ?? []).map((entry: NamedRef) => fetchJson(pathFromUrl(entry.url))),
      );
      const map = new Map<string, any>();
      for (const record of records) {
        if (record) map.set(record.name, record);
      }
      return map;
    })().catch((error) => {
      versionGroupsPromise = undefined;
      throw error;
    });
  }
  return versionGroupsPromise;
}

function evolutionNode(node: any): EvolutionNode {
  return {
    name: node.species.name,
    label: humanize(node.species.name),
    children: (node.evolves_to ?? []).map((child: any) => evolutionNode(child)),
  };
}

export const getPokemonPageData = query(
  async (name: string, game: string): Promise<PokemonPageData | null> => {
    "use server";
    const species = await fetchJson(`/api/v2/pokemon-species/${encodeURIComponent(name)}`);
    if (!species) return null;

    const variety =
      species.varieties?.find((entry: any) => entry.is_default)?.pokemon ??
      species.varieties?.[0]?.pokemon;
    if (!variety) return null;

    const [pokemon, chain, versionGroups] = await Promise.all([
      fetchJson(pathFromUrl(variety.url)),
      species.evolution_chain
        ? fetchJson(pathFromUrl(species.evolution_chain.url))
        : Promise.resolve(null),
      buildVersionGroups(),
    ]);
    if (!pokemon) return null;

    const englishTitle = englishName(species.names) || humanize(species.name);
    const genus =
      species.genera?.find((entry: any) => entry.language?.name === "en")?.genus ?? "";
    const flavorText =
      collapseWhitespace(latestEnglishFlavor(species.flavor_text_entries)) || "—";

    const availableGames = new Set<string>();
    for (const move of pokemon.moves ?? []) {
      for (const detail of move.version_group_details ?? []) {
        availableGames.add(detail.version_group.name);
      }
    }

    const gameOptions: GenerationOption[] = [...availableGames]
      .map((gameName) => versionGroups.get(gameName))
      .filter(Boolean)
      .sort((a: any, b: any) => Number(a.order) - Number(b.order))
      .map((record: any) => ({
        name: record.name,
        label: humanize(record.name),
        order: Number(record.order),
      }));

    const selectedGame = gameOptions.some((option) => option.name === game)
      ? game
      : gameOptions[gameOptions.length - 1]?.name ?? "";

    const methodMoves = new Map<string, Map<string, { moveName: string; level: number | null }>>();
    for (const move of pokemon.moves ?? []) {
      for (const detail of move.version_group_details ?? []) {
        if (detail.version_group.name !== selectedGame) continue;
        const method = detail.move_learn_method?.name;
        if (!method) continue;
        let movesForMethod = methodMoves.get(method);
        if (!movesForMethod) {
          movesForMethod = new Map();
          methodMoves.set(method, movesForMethod);
        }
        const level = detail.level_learned_at ?? null;
        const existing = movesForMethod.get(move.move.name);
        if (!existing) {
          movesForMethod.set(move.move.name, { moveName: move.move.name, level });
        } else if (method === "level-up" && level != null) {
          existing.level = existing.level == null ? level : Math.min(existing.level, level);
        }
      }
    }

    const allMoveNames = new Set<string>();
    for (const moves of methodMoves.values()) {
      for (const moveName of moves.keys()) allMoveNames.add(moveName);
    }
    const moveRecords = await Promise.all(
      [...allMoveNames].map((moveName) =>
        fetchJson(`/api/v2/move/${encodeURIComponent(moveName)}`),
      ),
    );
    const moveByName = new Map<string, any>();
    for (const record of moveRecords) {
      if (record) moveByName.set(record.name, record);
    }

    const methodPriority: Record<string, number> = {
      "level-up": 0,
      machine: 1,
      egg: 2,
      tutor: 3,
    };
    const methods = [...methodMoves.keys()].sort((a, b) => {
      const priorityA = methodPriority[a] ?? 100;
      const priorityB = methodPriority[b] ?? 100;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return humanize(a).localeCompare(humanize(b));
    });

    const tables: MoveTableData[] = methods.map((method) => {
      const movesForMethod = methodMoves.get(method)!;
      const rows: MoveRowData[] = [...movesForMethod.values()].map((entry) => {
        const record = moveByName.get(entry.moveName);
        const typeName = record?.type?.name ?? "";
        const categoryName = record?.damage_class?.name ?? "";
        return {
          moveName: entry.moveName,
          moveLabel: englishName(record?.names) || humanize(entry.moveName),
          typeName,
          typeLabel: humanize(typeName),
          categoryName,
          categoryLabel: humanize(categoryName),
          power: record?.power ?? null,
          accuracy: record?.accuracy ?? null,
          pp: record?.pp ?? null,
          level: method === "level-up" ? entry.level : null,
        };
      });

      rows.sort((a, b) => {
        if (method === "level-up") {
          const levelA = a.level ?? Number.POSITIVE_INFINITY;
          const levelB = b.level ?? Number.POSITIVE_INFINITY;
          if (levelA !== levelB) return levelA - levelB;
        }
        return a.moveLabel.localeCompare(b.moveLabel);
      });

      const columns: { key: string; label: string }[] = [
        ...(method === "level-up" ? [{ key: "level", label: "Level" }] : []),
        { key: "move", label: "Move" },
        { key: "type", label: "Type" },
        { key: "category", label: "Category" },
        { key: "power", label: "Power" },
        { key: "accuracy", label: "Accuracy" },
        { key: "pp", label: "PP" },
      ];

      return { method, label: humanize(method), columns, rows };
    });

    const stats = (pokemon.stats ?? []).map((entry: any) => ({
      name: entry.stat.name,
      label: statLabel(entry.stat.name),
      value: Number(entry.base_stat) || 0,
    }));
    const total = stats.reduce((sum: number, entry: { value: number }) => sum + entry.value, 0);

    const types: TypeRef[] = (pokemon.types ?? [])
      .slice()
      .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
      .map((entry: any) => ({
        name: entry.type.name,
        label: humanize(entry.type.name),
        slot: Number(entry.slot),
      }));

    const abilities = (pokemon.abilities ?? [])
      .slice()
      .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
      .map((entry: any) => ({
        name: entry.ability.name,
        label: humanize(entry.ability.name),
        hidden: Boolean(entry.is_hidden),
        slot: Number(entry.slot),
      }));

    const artwork =
      mediaUrl(
        pokemon.sprites?.other?.["official-artwork"]?.front_default ??
          pokemon.sprites?.front_default,
      ) ?? null;

    return {
      id: species.id,
      name: species.name,
      englishName: englishTitle,
      genus,
      types,
      artwork,
      height: Number(pokemon.height) || 0,
      weight: Number(pokemon.weight) || 0,
      flavorText,
      stats,
      total,
      abilities,
      evolution: chain?.chain
        ? evolutionNode(chain.chain)
        : { name: species.name, label: humanize(species.name), children: [] },
      gameOptions,
      selectedGame,
      tables,
    };
  },
  "pokemon-page",
);
