import {
  collapseWhitespace,
  englishField,
  englishGenus,
  englishName,
  englishShortEffect,
  humanize,
  latestEnglishFlavor,
  LEARN_METHOD_ORDER,
} from "./format";

const API_BASE_URL = (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/+$/, "");

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);
const PAGE_SIZE = 48;

type Ref = { name?: string; url: string };

const cache = new Map<string, Promise<any>>();

function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function idFromUrl(url: string | undefined | null): number | null {
  if (!url) return null;
  const match = String(url).match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export async function apiJson(url: string): Promise<any | null> {
  const absolute = absoluteUrl(url);
  let pending = cache.get(absolute);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(absolute, { headers: { accept: "application/json" } });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`PokeAPI request failed: ${response.status} ${absolute}`);
      return response.json();
    })();
    cache.set(absolute, pending);
    pending.catch(() => cache.delete(absolute));
  }
  return pending;
}

export function spriteUrl(id: number): string {
  return `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;
}

export function artworkUrl(pokemon: any): string | null {
  return (
    pokemon?.sprites?.other?.["official-artwork"]?.front_default ??
    pokemon?.sprites?.other?.home?.front_default ??
    pokemon?.sprites?.front_default ??
    null
  );
}

export async function getCoreData() {
  let pending = coreCache;
  if (!pending) {
    pending = loadCoreData();
    coreCache = pending;
    pending.catch(() => {
      coreCache = null;
    });
  }
  return pending;
}

let coreCache: Promise<CoreData> | null = null;

type CoreData = Awaited<ReturnType<typeof loadCoreData>>;

async function loadCoreData() {
  const [speciesPage, typePage, generationPage, versionGroupPage] = await Promise.all([
    apiJson("/api/v2/pokemon-species/?limit=100000"),
    apiJson("/api/v2/type/?limit=100000"),
    apiJson("/api/v2/generation/?limit=100000"),
    apiJson("/api/v2/version-group/?limit=100000"),
  ]);

  const species = (speciesPage?.results ?? [])
    .map((entry: Ref) => ({ id: idFromUrl(entry.url), name: entry.name }))
    .filter((entry: { id: number | null }) => entry.id != null && entry.id <= 10000)
    .sort((a: { id: number }, b: { id: number }) => a.id - b.id);

  const speciesById = new Map<number, { id: number; name: string }>();
  for (const entry of species) speciesById.set(entry.id, entry);

  const typeEntries = (typePage?.results ?? []).filter((entry: Ref) => !EXCLUDED_TYPES.has(entry.name ?? ""));
  const typeRecords = await Promise.all(typePage ? typeEntries.map((entry: Ref) => apiJson(entry.url)) : []);

  const types = typeEntries.map((entry: Ref, index: number) => {
    const record = typeRecords[index];
    return {
      name: entry.name,
      id: idFromUrl(entry.url),
      english: englishField(record) || humanize(entry.name ?? ""),
      order: index,
      record,
    };
  });

  const typeByName = new Map<string, any>();
  for (const type of types) typeByName.set(type.name, type);

  const typeSpecies = new Map<string, Set<number>>();
  const slots = new Map<number, { slot: number; type: string }[]>();
  for (const type of types) {
    const ids = new Set<number>();
    for (const entry of type.record?.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon?.url);
      if (id == null || id > 10000) continue;
      ids.add(id);
      const list = slots.get(id) ?? [];
      list.push({ slot: entry.slot ?? 0, type: type.name });
      slots.set(id, list);
    }
    typeSpecies.set(type.name, ids);
  }

  const pokemonTypes = new Map<number, string[]>();
  for (const [id, entries] of slots) {
    pokemonTypes.set(
      id,
      [...entries].sort((a, b) => a.slot - b.slot).map((entry) => entry.type),
    );
  }

  const generationRecords = await Promise.all(
    (generationPage?.results ?? []).map((entry: Ref) => apiJson(entry.url)),
  );
  const generations = (generationPage?.results ?? [])
    .map((entry: Ref, index: number) => {
      const record = generationRecords[index];
      return {
        name: entry.name,
        id: idFromUrl(entry.url) ?? index + 1,
        english: englishField(record) || humanize(entry.name ?? ""),
        speciesIds: (record?.pokemon_species ?? [])
          .map((ref: Ref) => idFromUrl(ref.url))
          .filter((id: number | null) => id != null && id <= 10000),
      };
    })
    .sort((a: { id: number }, b: { id: number }) => a.id - b.id);
  const generationByName = new Map<string, any>();
  for (const generation of generations) generationByName.set(generation.name, generation);

  const versionGroups = (versionGroupPage?.results ?? [])
    .map((entry: Ref) => ({ name: entry.name, id: idFromUrl(entry.url) }))
    .filter((entry: { id: number | null }) => entry.id != null);

  return {
    species,
    speciesById,
    types,
    typeByName,
    typeSpecies,
    pokemonTypes,
    generations,
    generationByName,
    versionGroups,
  };
}

async function getVersionGroup(name: string) {
  const core = await getCoreData();
  const entry = core.versionGroups.find((group: { name: string }) => group.name === name);
  if (!entry) return null;
  return apiJson(`/api/v2/version-group/${entry.id}/`);
}

export async function getHomeData(url: URL) {
  const core = await getCoreData();
  const q = url.searchParams.get("q") ?? "";
  const requestedType = url.searchParams.get("type") ?? "";
  const requestedGeneration = url.searchParams.get("generation") ?? "";
  const type = core.typeByName.has(requestedType) ? requestedType : "";
  const generation = core.generationByName.has(requestedGeneration) ? requestedGeneration : "";

  let filtered = core.species;
  if (q) {
    const needle = collapseWhitespace(q).toLowerCase();
    filtered = filtered.filter((entry: { name: string }) => humanize(entry.name).toLowerCase().includes(needle));
  }
  if (type) {
    const ids = core.typeSpecies.get(type);
    filtered = filtered.filter((entry: { id: number }) => ids?.has(entry.id));
  }
  if (generation) {
    const ids = new Set(core.generationByName.get(generation)?.speciesIds ?? []);
    filtered = filtered.filter((entry: { id: number }) => ids.has(entry.id));
  }

  const count = filtered.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const requestedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1;
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const cards = filtered.slice(start, start + PAGE_SIZE).map((entry: { id: number; name: string }) => ({
    id: entry.id,
    name: entry.name,
    display: humanize(entry.name),
    sprite: spriteUrl(entry.id),
    types: (core.pokemonTypes.get(entry.id) ?? []).map(
      (typeName: string) => core.typeByName.get(typeName)?.english ?? humanize(typeName),
    ),
  }));

  return {
    count,
    page,
    totalPages,
    cards,
    filters: { q, type, generation },
    types: core.types.map((entry: any) => ({ name: entry.name, english: entry.english })),
    generations: core.generations.map((entry: any) => ({ name: entry.name, english: entry.english })),
  };
}

export async function getPokemonData(name: string, game: string | null) {
  const species = await apiJson(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`);
  if (!species) return { notFound: true as const };

  const core = await getCoreData();
  const defaultVariety = (species.varieties ?? []).find((variety: any) => variety.is_default) ?? species.varieties?.[0];
  if (!defaultVariety?.pokemon?.url) return { notFound: true as const };
  const pokemon = await apiJson(defaultVariety.pokemon.url);
  if (!pokemon) return { notFound: true as const };

  const evolutionChain = species.evolution_chain ? await apiJson(species.evolution_chain.url) : null;

  const types = [...(pokemon.types ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((entry: any) => ({
      name: entry.type.name,
      english: core.typeByName.get(entry.type.name)?.english ?? humanize(entry.type.name),
    }));

  const abilities = [...(pokemon.abilities ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((entry: any) => ({
      name: entry.ability.name,
      display: humanize(entry.ability.name),
      hidden: Boolean(entry.is_hidden),
    }));

  const stats = (pokemon.stats ?? []).map((entry: any) => ({
    name: entry.stat.name,
    value: entry.base_stat,
  }));
  const total = stats.reduce((sum: number, stat: { value: number }) => sum + stat.value, 0);

  const moves = await getMovesForPokemon(pokemon, selectedGameName(game));

  return {
    id: species.id,
    pokeName: species.name,
    name: englishName(species) || humanize(species.name),
    genus: englishGenus(species),
    description: latestEnglishFlavor(species),
    artwork: officialArtworkOrFront(pokemon),
    types,
    measurements: {
      height: typeof pokemon.height === "number" ? (pokemon.height / 10).toFixed(1) : null,
      weight: typeof pokemon.weight === "number" ? (pokemon.weight / 10).toFixed(1) : null,
    },
    stats: stats.map((stat: any) => ({
      ...stat,
      label: stat.name === "hp" ? "HP" : humanize(stat.name).replace(/^Special Attack$/, "Sp. Atk").replace(/^Special Defense$/, "Sp. Def"),
    })),
    total,
    abilities,
    evolution: evolutionChain?.chain ? buildEvolutionNode(evolutionChain.chain) : null,
    moves,
  };
}

function officialArtworkOrFront(pokemon: any) {
  return (
    pokemon?.sprites?.other?.["official-artwork"]?.front_default ??
    pokemon?.sprites?.other?.home?.front_default ??
    pokemon?.sprites?.front_default ??
    null
  );
}

function selectedGameName(game: string | null): string | null {
  return game && game.trim() ? game : null;
}

function buildEvolutionNode(node: any): any {
  return {
    name: node.species?.name ?? "",
    display: humanize(node.species?.name ?? ""),
    children: (node.evolves_to ?? []).map((child: any) => buildEvolutionNode(child)),
  };
}

async function getMovesForPokemon(pokemon: any, requestedGame: string | null) {
  const details: any[] = [];
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      details.push({ move: moveEntry.move, detail });
    }
  }

  const versionGroupNames = [...new Set(details.map((entry) => entry.detail.version_group.name))];
  const versionGroups = (
    await Promise.all(
      versionGroupNames.map(async (versionGroupName) => {
        const record = await getVersionGroup(versionGroupName);
        return { name: versionGroupName, order: record?.order ?? 0 };
      }),
    )
  ).sort((a, b) => a.order - b.order);

  if (!versionGroups.length) {
    return { games: [], selectedGame: null, tables: [] };
  }

  const selected =
    versionGroups.find((group) => group.name === requestedGame) ?? versionGroups[versionGroups.length - 1];
  const selectedDetails = details.filter((entry) => entry.detail.version_group.name === selected.name);
  const moveNames = [...new Set(selectedDetails.map((entry) => entry.move.name))];
  const moveRecords = await Promise.all(moveNames.map((moveName) => apiJson(`/api/v2/move/${encodeURIComponent(moveName)}/`)));
  const moveByName = new Map<string, any>();
  moveRecords.filter(Boolean).forEach((record: any) => moveByName.set(record.name, record));
  const core = await getCoreData();

  const byMethod = new Map<string, any[]>();
  for (const entry of selectedDetails) {
    const move = moveByName.get(entry.move.name);
    const method = entry.detail.move_learn_method?.name ?? "other";
    const rows = byMethod.get(method) ?? [];
    rows.push({
      level:
        typeof entry.detail.level_learned_at === "number" && entry.detail.level_learned_at > 0
          ? entry.detail.level_learned_at
          : entry.detail.level_learned_at === 0
            ? 0
            : null,
      moveName: move?.name ?? entry.move.name,
      moveDisplay: englishName(move) || humanize(entry.move.name),
      moveType: move?.type?.name ?? "",
      typeEnglish: core.typeByName.get(move?.type?.name)?.english ?? humanize(move?.type?.name ?? ""),
      category: humanize(move?.damage_class?.name ?? ""),
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    });
    byMethod.set(method, rows);
  }

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ai = LEARN_METHOD_ORDER.indexOf(a);
    const bi = LEARN_METHOD_ORDER.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return humanize(a).localeCompare(humanize(b));
  });

  const tables = methods
    .map((method) => {
      const rows = byMethod.get(method) ?? [];
      const sorted = [...rows].sort((a, b) => {
        if (method === "level-up") {
          const alevel = a.level == null ? Number.POSITIVE_INFINITY : a.level;
          const blevel = b.level == null ? Number.POSITIVE_INFINITY : b.level;
          if (alevel !== blevel) return alevel - blevel;
        }
        return a.moveDisplay.localeCompare(b.moveDisplay);
      });
      return {
        method,
        label: humanize(method),
        hasLevel: method === "level-up",
        rows: sorted,
      };
    })
    .filter((table) => table.rows.length > 0);

  return {
    games: versionGroups.map((group) => ({ name: group.name, display: humanize(group.name) })),
    selectedGame: selected.name,
    tables,
  };
}

export async function getMoveData(name: string) {
  const move = await apiJson(`/api/v2/move/${encodeURIComponent(name)}/`);
  if (!move) return { notFound: true as const };
  const core = await getCoreData();
  const effect = englishShortEffect(move) || latestEnglishFlavor(move) || "\u2014";
  const cards = await cardsFromPokemonRefs(move.learned_by_pokemon ?? [], core);

  return {
    id: move.id,
    name: englishName(move) || humanize(move.name),
    type: {
      name: move.type?.name ?? "",
      english: core.typeByName.get(move.type?.name)?.english ?? humanize(move.type?.name ?? ""),
    },
    category: humanize(move.damage_class?.name ?? ""),
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    cards,
  };
}

export async function getAbilityData(name: string) {
  const ability = await apiJson(`/api/v2/ability/${encodeURIComponent(name)}/`);
  if (!ability) return { notFound: true as const };
  const core = await getCoreData();

  const hiddenById = new Map<number, boolean>();
  const refs: Ref[] = [];
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url);
    if (id == null || id > 10000) continue;
    if (!hiddenById.has(id)) {
      hiddenById.set(id, false);
      refs.push(entry.pokemon);
    }
    if (entry.is_hidden) hiddenById.set(id, true);
  }

  const cards = await cardsFromPokemonRefs(refs, core);
  return {
    id: ability.id,
    name: englishName(ability) || humanize(ability.name),
    effect: englishShortEffect(ability) || "\u2014",
    cards: cards.map((card) => ({ ...card, hidden: hiddenById.get(card.id) ?? false })),
  };
}

export async function getTypesData() {
  const core = await getCoreData();
  return core.types.map((entry: any) => ({ name: entry.name, english: entry.english }));
}

export async function getTypeData(name: string) {
  const type = await apiJson(`/api/v2/type/${encodeURIComponent(name)}/`);
  if (!type) return { notFound: true as const };
  const core = await getCoreData();

  const relationKeys: [string, string][] = [
    ["double_damage_to", "Super effective against"],
    ["half_damage_to", "Not very effective against"],
    ["no_damage_to", "No effect against"],
    ["double_damage_from", "Weak to"],
    ["half_damage_from", "Resists"],
    ["no_damage_from", "Immune to"],
  ];

  const relations = relationKeys.map(([key, label]) => ({
    label,
    types: (type.damage_relations?.[key] ?? []).map((ref: Ref) => ({
      name: ref.name,
      english: core.typeByName.get(ref.name ?? "")?.english ?? humanize(ref.name ?? ""),
    })),
  }));

  const cards = await cardsFromPokemonRefs(
    (type.pokemon ?? []).map((entry: any) => entry.pokemon),
    core,
  );
  const moves = (type.moves ?? [])
    .map((move: Ref) => ({ name: move.name, display: humanize(move.name ?? "") }))
    .sort((a: any, b: any) => a.display.localeCompare(b.display));

  return {
    id: type.id,
    name: englishField(type) || humanize(type.name),
    relations,
    cards,
    moves,
  };
}

async function cardsFromPokemonRefs(refs: Ref[], core: CoreData) {
  const seen = new Set<number>();
  const cards: { id: number; name: string; display: string; sprite: string; types: string[] }[] = [];
  for (const ref of refs) {
    const id = idFromUrl(ref?.url);
    if (id == null || id > 10000 || seen.has(id)) continue;
    seen.add(id);
    const species = core.speciesById.get(id);
    const name = species?.name ?? ref.name ?? String(id);
    cards.push({
      id,
      name,
      display: humanize(name),
      sprite: spriteUrl(id),
      types: core.pokemonTypes.get(id) ?? [],
    });
  }
  return cards.sort((a, b) => a.id - b.id);
}
