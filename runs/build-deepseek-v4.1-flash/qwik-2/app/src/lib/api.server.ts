import {
  EXCLUDED_TYPES,
  STAT_LABELS,
  collapseWhitespace,
  displayMissing,
  englishName,
  humanize,
  latestEnglishFlavor,
} from "./format";

const API_ORIGIN = String(
  (globalThis as any).process?.env?.API_BASE_URL || "http://localhost:9000",
).replace(/\/+$/, "");

export const PAGE_SIZE = 48;

type AnyRecord = Record<string, any>;

export interface SpeciesRef {
  id: number;
  name: string;
}

export interface CardData {
  id: number;
  name: string;
  sprite: string;
  hidden?: boolean;
}

function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return `${API_ORIGIN}${path}`;
  return `${API_ORIGIN}/api/v2/${path.replace(/^\/+/, "")}`;
}

const responseCache = new Map<string, Promise<any | null>>();

async function getJson(path: string): Promise<any | null> {
  const url = apiUrl(path);
  let pending = responseCache.get(url);
  if (!pending) {
    pending = fetch(url, { headers: { Accept: "application/json" } }).then(
      async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${url}`);
        }
        return response.json();
      },
    );
    responseCache.set(url, pending);
  }
  return pending;
}

function parseId(url: string | undefined | null): number {
  const match = String(url || "").match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

function spriteUrl(id: number): string {
  return `${API_ORIGIN}/media/sprites/pokemon/${id}.png`;
}

async function getList(resource: string): Promise<AnyRecord[]> {
  const data = await getJson(`${resource}/?limit=100000&offset=0`);
  return Array.isArray(data?.results) ? data.results : [];
}

let speciesIndexPromise: Promise<SpeciesRef[]> | undefined;

function getSpeciesIndex(): Promise<SpeciesRef[]> {
  if (!speciesIndexPromise) {
    speciesIndexPromise = getList("pokemon-species").then((results) =>
      results
        .map((entry) => ({ id: parseId(entry.url), name: String(entry.name) }))
        .filter((entry) => entry.id > 0)
        .sort((a, b) => a.id - b.id),
    );
  }
  return speciesIndexPromise;
}

let speciesByIdPromise: Promise<Map<number, SpeciesRef>> | undefined;

function getSpeciesById(): Promise<Map<number, SpeciesRef>> {
  if (!speciesByIdPromise) {
    speciesByIdPromise = getSpeciesIndex().then(
      (species) => new Map(species.map((entry) => [entry.id, entry])),
    );
  }
  return speciesByIdPromise;
}

interface TypeCatalogEntry {
  name: string;
  english: string;
  pokemon: AnyRecord[];
}

let typeCatalogPromise: Promise<AnyRecord[]> | undefined;

function getTypeCatalog(): Promise<AnyRecord[]> {
  if (!typeCatalogPromise) {
    typeCatalogPromise = (async () => {
      const list = (await getList("type")).filter(
        (entry) => !EXCLUDED_TYPES.has(String(entry.name)),
      );
      const details = await Promise.all(
        list.map((entry) => getJson(`type/${encodeURIComponent(entry.name)}`)),
      );
      return details
        .filter(Boolean)
        .map((detail) => ({
          name: String(detail.name),
          english: englishName(detail.names, humanize(detail.name)),
          pokemon: Array.isArray(detail.pokemon) ? detail.pokemon : [],
        }));
    })();
  }
  return typeCatalogPromise;
}

interface GenerationCatalogEntry {
  name: string;
  english: string;
  order: number;
  species: AnyRecord[];
}

let generationCatalogPromise: Promise<GenerationCatalogEntry[]> | undefined;

function getGenerationCatalog(): Promise<GenerationCatalogEntry[]> {
  if (!generationCatalogPromise) {
    generationCatalogPromise = (async () => {
      const list = await getList("generation");
      const details = await Promise.all(
        list.map((entry) =>
          getJson(`generation/${encodeURIComponent(entry.name)}`),
        ),
      );
      return details
        .filter(Boolean)
        .map((detail, index) => ({
          name: String(detail.name),
          english: englishName(detail.names, humanize(detail.name)),
          order: Number(detail.id) || index + 1,
          species: Array.isArray(detail.pokemon_species)
            ? detail.pokemon_species
            : [],
        }))
        .sort((a, b) => a.order - b.order);
    })();
  }
  return generationCatalogPromise;
}

export interface HomeSpecies {
  id: number;
  name: string;
  generation: string | null;
  types: Array<{ name: string; english: string }>;
  sprite: string;
}

export interface HomeData {
  species: HomeSpecies[];
  types: Array<{ name: string; english: string }>;
  generations: Array<{ name: string; english: string }>;
}

let homeDataPromise: Promise<HomeData> | undefined;

function getHomeData(): Promise<HomeData> {
  if (!homeDataPromise) {
    homeDataPromise = (async () => {
      const [species, typeCatalog, generationCatalog] = await Promise.all([
        getSpeciesIndex(),
        getTypeCatalog(),
        getGenerationCatalog(),
      ]);

      const typesByPokemon = new Map<
        number,
        Array<{ name: string; english: string; slot: number }>
      >();
      for (const type of typeCatalog as TypeCatalogEntry[]) {
        for (const entry of type.pokemon) {
          const id = parseId(entry.pokemon?.url);
          if (!id || id > 10000) continue;
          const list = typesByPokemon.get(id) || [];
          list.push({
            name: type.name,
            english: type.english,
            slot: Number(entry.slot) || 99,
          });
          typesByPokemon.set(id, list);
        }
      }

      const generationBySpecies = new Map<number, string>();
      for (const generation of generationCatalog) {
        for (const entry of generation.species) {
          const id = parseId(entry.url);
          if (id) generationBySpecies.set(id, generation.name);
        }
      }

      return {
        species: species.map((entry) => ({
          ...entry,
          generation: generationBySpecies.get(entry.id) || null,
          types: (typesByPokemon.get(entry.id) || [])
            .sort((a, b) => a.slot - b.slot)
            .map((type) => ({ name: type.name, english: type.english })),
          sprite: spriteUrl(entry.id),
        })),
        types: (typeCatalog as TypeCatalogEntry[]).map((type) => ({
          name: type.name,
          english: type.english,
        })),
        generations: generationCatalog.map((generation) => ({
          name: generation.name,
          english: generation.english,
        })),
      };
    })();
  }
  return homeDataPromise;
}

export interface HomePageData {
  q: string;
  type: string;
  generation: string;
  page: number;
  totalPages: number;
  count: number;
  species: HomeSpecies[];
  types: Array<{ name: string; english: string }>;
  generations: Array<{ name: string; english: string }>;
}

export async function loadHomePage(url: URL): Promise<HomePageData> {
  const data = await getHomeData();
  const q = (url.searchParams.get("q") || "").trim();
  const requestedType = url.searchParams.get("type") || "";
  const requestedGeneration = url.searchParams.get("generation") || "";
  const type = data.types.some((entry) => entry.name === requestedType)
    ? requestedType
    : "";
  const generation = data.generations.some(
    (entry) => entry.name === requestedGeneration,
  )
    ? requestedGeneration
    : "";
  const query = q.toLowerCase();

  const filtered = data.species.filter((entry) => {
    if (query && !humanize(entry.name).toLowerCase().includes(query)) {
      return false;
    }
    if (type && !entry.types.some((entryType) => entryType.name === type)) {
      return false;
    }
    if (generation && entry.generation !== generation) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requestedPage = Number.parseInt(url.searchParams.get("page") || "1", 10);
  const page = Math.min(
    totalPages,
    Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1),
  );
  const start = (page - 1) * PAGE_SIZE;

  return {
    q,
    type,
    generation,
    page,
    totalPages,
    count: filtered.length,
    species: filtered.slice(start, start + PAGE_SIZE),
    types: data.types,
    generations: data.generations,
  };
}

function refsToCards(
  refs: AnyRecord[] | undefined,
  speciesById: Map<number, SpeciesRef>,
  showHidden = false,
): CardData[] {
  const cards: CardData[] = [];
  const seen = new Set<number>();
  for (const ref of refs || []) {
    const pokemonRef = ref?.pokemon || ref;
    const id = parseId(pokemonRef?.url);
    if (!id || id > 10000 || seen.has(id)) continue;
    const species = speciesById.get(id);
    if (!species) continue;
    seen.add(id);
    cards.push({
      id: species.id,
      name: species.name,
      sprite: spriteUrl(species.id),
      ...(showHidden ? { hidden: Boolean(ref.is_hidden) } : {}),
    });
  }
  return cards.sort((a, b) => a.id - b.id);
}

interface EvolutionNode {
  name: string;
  children: EvolutionNode[];
}

function buildEvolutionTree(node: AnyRecord | undefined): EvolutionNode | null {
  if (!node?.species?.name) return null;
  return {
    name: String(node.species.name),
    children: (Array.isArray(node.evolves_to) ? node.evolves_to : [])
      .map((child: AnyRecord) => buildEvolutionTree(child))
      .filter(Boolean) as EvolutionNode[],
  };
}

interface StatRow {
  label: string;
  value: number;
}

interface MoveRow {
  level: number | null;
  moveName: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

interface MoveGroup {
  method: string;
  label: string;
  showLevel: boolean;
  rows: MoveRow[];
}

export interface PokemonPageData {
  title: string;
  speciesName: string;
  speciesId: number;
  genus: string;
  types: Array<{ name: string; english: string }>;
  artwork: string | null;
  height: string;
  weight: string;
  flavor: string;
  stats: StatRow[];
  statTotal: number;
  abilities: Array<{ name: string; label: string; hidden: boolean }>;
  evolution: EvolutionNode | null;
  games: Array<{ name: string; label: string; order: number }>;
  game: string;
  moveGroups: MoveGroup[];
}

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

export async function loadPokemonPage(
  name: string,
  requestedGame: string,
): Promise<PokemonPageData | null> {
  const species = await getJson(`pokemon-species/${encodeURIComponent(name)}`);
  if (!species) return null;

  const varieties = Array.isArray(species.varieties) ? species.varieties : [];
  const defaultVariety =
    varieties.find((entry: AnyRecord) => entry.is_default) ||
    varieties[0] ||
    null;
  const pokemonRef = defaultVariety?.pokemon || {
    name: species.name,
    url: `/api/v2/pokemon/${species.id}/`,
  };
  const pokemon = await getJson(pokemonRef.url);
  if (!pokemon) return null;

  const speciesId = Number(species.id);
  const title = englishName(species.names, humanize(species.name));
  const genusEntry = (Array.isArray(species.genera) ? species.genera : []).find(
    (entry: AnyRecord) => entry.language?.name === "en",
  );
  const genus = genusEntry?.genus || "—";

  const evolutionChainData = species.evolution_chain?.url
    ? await getJson(species.evolution_chain.url)
    : null;

  const versionGroups = new Map<string, { name: string; url: string }>();
  for (const moveEntry of Array.isArray(pokemon.moves) ? pokemon.moves : []) {
    for (const detail of moveDetails(moveEntry)) {
      const group = detail.version_group;
      if (group?.name && group?.url) {
        versionGroups.set(String(group.name), {
          name: String(group.name),
          url: String(group.url),
        });
      }
    }
  }

  const versionGroupRecords = await Promise.all(
    [...versionGroups.values()].map((group) => getJson(group.url)),
  );
  const games = [...versionGroups.values()]
    .map((group, index) => {
      const record = versionGroupRecords[index];
      return {
        name: group.name,
        label: humanize(group.name),
        order: Number(record?.order) || 0,
      };
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const game =
    games.find((entry) => entry.name === requestedGame)?.name ||
    games[games.length - 1]?.name ||
    "";

  const methodDetails = new Map<string, AnyRecord[]>();
  const moveRefs = new Map<string, { name: string; url: string }>();
  for (const moveEntry of Array.isArray(pokemon.moves) ? pokemon.moves : []) {
    const move = moveEntry?.move;
    if (!move?.name || !move?.url) continue;
    moveRefs.set(String(move.name), {
      name: String(move.name),
      url: String(move.url),
    });
    for (const detail of Array.isArray(moveEntry.version_group_details)
      ? moveEntry.version_group_details
      : []) {
      if (detail.version_group?.name !== game) continue;
      const method = String(detail.move_learn_method?.name || "other");
      const list = methodDetails.get(method) || [];
      list.push({
        ...detail,
        moveName: move.name,
        moveUrl: move.url,
      });
      methodDetails.set(method, list);
    }
  }

  const selectedMoveNames = new Set<string>();
  for (const details of methodDetails.values()) {
    for (const detail of details) selectedMoveNames.add(String(detail.moveName));
  }

  const moveRecords = await Promise.all(
    [...selectedMoveNames].map(async (moveName) => {
      const ref = moveRefs.get(moveName);
      return [moveName, ref ? await getJson(ref.url) : null] as const;
    }),
  );
  const moveRecordByName = new Map(moveRecords);

  const moveGroups: MoveGroup[] = [];
  const methods = [...methodDetails.keys()].sort((a, b) => {
    const ai = METHOD_ORDER.indexOf(a);
    const bi = METHOD_ORDER.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return humanize(a).localeCompare(humanize(b));
  });

  for (const method of methods) {
    const rows: MoveRow[] = [];
    for (const detail of methodDetails.get(method) || []) {
      const moveName = String(detail.moveName);
      const record = moveRecordByName.get(moveName);
      const typeName = String(record?.type?.name || "");
      rows.push({
        level:
          method === "level-up" && detail.level_learned_at != null
            ? Number(detail.level_learned_at)
            : null,
        moveName: String(record?.name || moveName),
        moveLabel: englishName(record?.names, humanize(moveName)),
        typeName,
        typeLabel: humanize(typeName) || "—",
        category: humanize(record?.damage_class?.name) || "—",
        power: record?.power == null ? null : Number(record.power),
        accuracy: record?.accuracy == null ? null : Number(record.accuracy),
        pp: record?.pp == null ? null : Number(record.pp),
      });
    }
    if (rows.length) {
      moveGroups.push({
        method,
        label: humanize(method),
        showLevel: method === "level-up",
        rows,
      });
    }
  }

  const stats: StatRow[] = (
    Array.isArray(pokemon.stats) ? pokemon.stats : []
  ).map((entry: AnyRecord) => ({
    label: STAT_LABELS[entry.stat?.name] || humanize(entry.stat?.name),
    value: Number(entry.base_stat) || 0,
  }));
  const statTotal = stats.reduce(
    (sum: number, stat: StatRow) => sum + stat.value,
    0,
  );

  const abilities = (Array.isArray(pokemon.abilities) ? pokemon.abilities : [])
    .slice()
    .sort((a: AnyRecord, b: AnyRecord) => Number(a.slot) - Number(b.slot))
    .map((entry: AnyRecord) => ({
      name: String(entry.ability?.name || ""),
      label: humanize(entry.ability?.name),
      hidden: Boolean(entry.is_hidden),
    }))
    .filter((entry: AnyRecord) => entry.name);

  return {
    title,
    speciesName: String(species.name),
    speciesId,
    genus,
    types: (Array.isArray(pokemon.types) ? pokemon.types : [])
      .slice()
      .sort((a: AnyRecord, b: AnyRecord) => Number(a.slot) - Number(b.slot))
      .map((entry: AnyRecord) => ({
        name: String(entry.type?.name || ""),
        english: humanize(entry.type?.name),
      }))
      .filter((entry: AnyRecord) => entry.name),
    artwork:
      pokemon.sprites?.other?.["official-artwork"]?.front_default || null,
    height: `${(Number(pokemon.height) / 10).toFixed(1)} m`,
    weight: `${(Number(pokemon.weight) / 10).toFixed(1)} kg`,
    flavor:
      latestEnglishFlavor(species.flavor_text_entries) || "—",
    stats,
    statTotal,
    abilities,
    evolution: evolutionChainData?.chain
      ? buildEvolutionTree(evolutionChainData.chain)
      : null,
    games,
    game,
    moveGroups,
  };
}

function moveDetails(entry: AnyRecord): AnyRecord[] {
  return Array.isArray(entry?.version_group_details)
    ? entry.version_group_details
    : [];
}

export interface MovePageData {
  title: string;
  name: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: string;
  accuracy: string;
  pp: string;
  effect: string;
  cards: CardData[];
}

export async function loadMovePage(name: string): Promise<MovePageData | null> {
  const move = await getJson(`move/${encodeURIComponent(name)}`);
  if (!move) return null;
  const speciesById = await getSpeciesById();
  const shortEffect = (Array.isArray(move.effect_entries)
    ? move.effect_entries
    : []
  ).find((entry: AnyRecord) => entry.language?.name === "en")?.short_effect;
  const flavor = latestEnglishFlavor(move.flavor_text_entries);
  return {
    title: englishName(move.names, humanize(move.name)),
    name: String(move.name),
    typeName: String(move.type?.name || ""),
    typeLabel: humanize(move.type?.name) || "—",
    category: humanize(move.damage_class?.name) || "—",
    power: displayMissing(move.power),
    accuracy: displayMissing(move.accuracy),
    pp: displayMissing(move.pp),
    effect: shortEffect ? collapseWhitespace(shortEffect) : flavor || "—",
    cards: refsToCards(move.learned_by_pokemon, speciesById),
  };
}

export interface AbilityPageData {
  title: string;
  name: string;
  effect: string;
  cards: CardData[];
}

export async function loadAbilityPage(
  name: string,
): Promise<AbilityPageData | null> {
  const ability = await getJson(`ability/${encodeURIComponent(name)}`);
  if (!ability) return null;
  const speciesById = await getSpeciesById();
  const shortEffect = (Array.isArray(ability.effect_entries)
    ? ability.effect_entries
    : []
  ).find((entry: AnyRecord) => entry.language?.name === "en")?.short_effect;
  return {
    title: englishName(ability.names, humanize(ability.name)),
    name: String(ability.name),
    effect: shortEffect ? collapseWhitespace(shortEffect) : "—",
    cards: refsToCards(ability.pokemon, speciesById, true),
  };
}

export interface TypeListData {
  types: Array<{ name: string; english: string }>;
}

export async function loadTypeList(): Promise<TypeListData> {
  const catalog = (await getTypeCatalog()) as TypeCatalogEntry[];
  return {
    types: catalog.map((type) => ({
      name: type.name,
      english: type.english,
    })),
  };
}

export interface DamageRelation {
  term: string;
  types: Array<{ name: string; english: string }>;
}

export interface TypePageData {
  title: string;
  name: string;
  relations: DamageRelation[];
  cards: CardData[];
  moves: Array<{ name: string; label: string }>;
}

const RELATION_TERMS: Array<[string, string]> = [
  ["Super effective against", "double_damage_to"],
  ["Not very effective against", "half_damage_to"],
  ["No effect against", "no_damage_to"],
  ["Weak to", "double_damage_from"],
  ["Resists", "half_damage_from"],
  ["Immune to", "no_damage_from"],
];

export async function loadTypePage(
  name: string,
): Promise<TypePageData | null> {
  const catalog = (await getTypeCatalog()) as TypeCatalogEntry[];
  const typeEntry = catalog.find((entry) => entry.name === name);
  if (!typeEntry) return null;
  const type = await getJson(`type/${encodeURIComponent(name)}`);
  if (!type) return null;
  const typeNames = new Map(catalog.map((entry) => [entry.name, entry.english]));
  const [speciesById] = await Promise.all([getSpeciesById()]);
  return {
    title: englishName(type.names, humanize(type.name)),
    name: String(type.name),
    relations: RELATION_TERMS.map(([term, key]) => ({
      term,
      types: (Array.isArray(type.damage_relations?.[key])
        ? type.damage_relations[key]
        : []
      ).map((entry: AnyRecord) => ({
        name: String(entry.name),
        english: typeNames.get(String(entry.name)) || humanize(entry.name),
      })),
    })),
    cards: refsToCards(type.pokemon, speciesById),
    moves: (Array.isArray(type.moves) ? type.moves : [])
      .map((entry: AnyRecord) => ({
        name: String(entry.name),
        label: humanize(entry.name),
      }))
      .sort((a: AnyRecord, b: AnyRecord) => a.label.localeCompare(b.label)),
  };
}
