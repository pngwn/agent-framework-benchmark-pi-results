import { fetchJson, idFromUrl, mediaOrigin } from './api';
import { Catalog, getCatalog, SpeciesInfo, TypeInfo, VersionGroupInfo } from './catalog';
import {
  AbilityRecord,
  EvolutionChainRecord,
  EvolutionNode,
  formatDex,
  humanize,
  latestEnglishFlavor,
  MoveRecord,
  NameInfo,
  PokemonRecord,
  Ref,
  SpeciesRecord,
  englishName,
  uniqueBy,
} from './models';

export interface CardData {
  id: number;
  dex: string;
  name: string;
  label: string;
  nameParam: string;
  sprite: string;
}

export interface HomeData {
  catalog: Catalog;
  q: string;
  typeName: string;
  generationName: string;
  page: number;
  totalPages: number;
  total: number;
  items: { species: SpeciesInfo; sprite: string; types: { name: string; label: string }[] }[];
}

export interface PokemonPageData {
  species: SpeciesRecord;
  pokemon: PokemonRecord;
  englishName: string;
  genus: string;
  flavor: string;
  dex: string;
  types: { name: string; label: string }[];
  height: string;
  weight: string;
  artwork: string;
  stats: { key: string; label: string; value: number }[];
  statTotal: number;
  abilities: { name: string; label: string; hidden: boolean }[];
  evolution: EvolutionNode | null;
  games: GameMoves[];
  initialGame: string;
}

export interface MoveRowData {
  moveName: string;
  moveLabel: string;
  typeName: string;
  typeLabel: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  level: number | null;
}

export interface MoveTableData {
  method: string;
  label: string;
  rows: MoveRowData[];
}

export interface GameMoves {
  name: string;
  label: string;
  tables: { method: string; label: string; rows: MoveRowData[] }[];
}

export interface MovePageData {
  record: MoveRecord;
  englishName: string;
  type: { name: string; label: string };
  category: string;
  effect: string;
  learnedBy: CardData[];
}

export interface AbilityPageData {
  record: AbilityRecord;
  englishName: string;
  effect: string;
  pokemon: { card: CardData; hidden: boolean }[];
}

export interface TypePageData {
  type: TypeInfo;
  pokemon: CardData[];
  moves: { name: string; label: string }[];
}

export interface NotFoundResult {
  notFound: true;
}

export function isNotFound<T>(value: T | NotFoundResult): value is NotFoundResult {
  return typeof value === 'object' && value !== null && 'notFound' in value;
}

const notFound: NotFoundResult = { notFound: true };

function cardForSpecies(catalog: Catalog, species: SpeciesInfo): CardData {
  return {
    id: species.id,
    dex: formatDex(species.id),
    name: species.name,
    label: species.label,
    nameParam: species.name,
    sprite: catalog.spriteUrl(species.id),
  };
}

function speciesForPokemonRef(catalog: Catalog, ref: Ref): SpeciesInfo | null {
  const id = idFromUrl(ref.url);
  if (id === null) return null;
  const species = catalog.speciesById.get(id);
  if (species) return species;
  return { id, name: ref.name, label: humanize(ref.name) };
}

export function cardForPokemonRef(catalog: Catalog, ref: Ref): CardData | null {
  const species = speciesForPokemonRef(catalog, ref);
  if (!species) return null;
  return cardForSpecies(catalog, species);
}

function englishEffect(entries: { short_effect: string; language: Ref }[] | undefined): string {
  return entries?.find((entry) => entry.language?.name === 'en')?.short_effect?.trim() ?? '';
}

export async function getSpeciesRecord(name: string): Promise<SpeciesRecord | null> {
  return fetchJson<SpeciesRecord>(`pokemon-species/${encodeURIComponent(name)}`);
}

export async function getMoveRecord(name: string): Promise<MoveRecord | null> {
  return fetchJson<MoveRecord>(`move/${encodeURIComponent(name)}`);
}

export async function getAbilityRecord(name: string): Promise<AbilityRecord | null> {
  return fetchJson<AbilityRecord>(`ability/${encodeURIComponent(name)}`);
}

export async function getVersionGroupList(catalog: Catalog): Promise<VersionGroupInfo[]> {
  return catalog.versionGroups;
}

export async function getHomeData(params: {
  q?: string;
  type?: string;
  generation?: string;
  page?: string;
}): Promise<HomeData> {
  const catalog = await getCatalog();

  const q = (params.q ?? '').trim();
  const typeName = params.type && catalog.typesByName.has(params.type) ? params.type : '';
  const generationName =
    params.generation && catalog.generationsByName.has(params.generation) ? params.generation : '';

  let results = catalog.species;

  if (q) {
    const needle = q.toLowerCase();
    results = results.filter((species) => species.label.toLowerCase().includes(needle));
  }
  if (typeName) {
    const ids = catalog.typesByName.get(typeName)?.pokemonIds ?? new Set<number>();
    results = results.filter((species) => ids.has(species.id));
  }
  if (generationName) {
    results = results.filter(
      (species) => catalog.generationBySpeciesName.get(species.name) === generationName,
    );
  }

  const total = results.length;
  const pageSize = 48;
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const requestedPage = Number.parseInt(params.page ?? '1', 10);
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const start = (page - 1) * pageSize;

  const items = results.slice(start, start + pageSize).map((species) => ({
    species,
    sprite: catalog.spriteUrl(species.id),
    types: (catalog.typesByPokemonId.get(species.id) ?? []).map((type) => ({
      name: type.name,
      label: type.label,
    })),
  }));

  return { catalog, q, typeName, generationName, page, totalPages, total, items };
}

interface GameBuilderMap {
  [game: string]: {
    [method: string]: Map<string, number | null>;
  };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const current = index;
        index += 1;
        if (current >= items.length) return;
        results[current] = await fn(items[current]);
      }
    }),
  );
  return results;
}

function methodRank(method: string): number {
  if (method === 'level-up') return 0;
  if (method === 'machine') return 1;
  if (method === 'egg') return 2;
  if (method === 'tutor') return 3;
  return 4;
}

function sortDefaultRows(rows: MoveRowData[], method: string): MoveRowData[] {
  const copy = rows.slice();
  if (method === 'level-up') {
    copy.sort((a, b) => {
      const levelA = a.level ?? Number.MAX_SAFE_INTEGER;
      const levelB = b.level ?? Number.MAX_SAFE_INTEGER;
      if (levelA !== levelB) return levelA - levelB;
      return a.moveLabel.localeCompare(b.moveLabel);
    });
  } else {
    copy.sort((a, b) => a.moveLabel.localeCompare(b.moveLabel));
  }
  return copy;
}

async function buildGameMoves(
  pokemon: PokemonRecord,
  catalog: Catalog,
): Promise<{ games: GameMoves[]; initialGame: string }> {
  const games: GameBuilderMap = {};

  for (const entry of pokemon.moves ?? []) {
    for (const detail of entry.version_group_details ?? []) {
      const gameName = detail.version_group?.name;
      const method = detail.move_learn_method?.name;
      if (!gameName || !method) continue;
      const game = (games[gameName] ??= {});
      const methods = (game[method] ??= new Map<string, number | null>());
      const level = method === 'level-up' ? detail.level_learned_at : null;
      const existing = methods.get(entry.move.name);
      if (existing === undefined) {
        methods.set(entry.move.name, level);
      } else if (level !== null && (existing === null || level < existing)) {
        methods.set(entry.move.name, level);
      }
    }
  }

  const gameNames = Object.keys(games);
  const moveNames = uniqueBy(
    gameNames.flatMap((game) => Object.values(games[game]).flatMap((methods) => [...methods.keys()])),
    (name) => name,
  );

  const moveRecords = await mapLimit(moveNames, 24, (name) => getMoveRecord(name));
  const movesByName = new Map<string, MoveRecord | null>();
  moveNames.forEach((name, index) => movesByName.set(name, moveRecords[index] ?? null));

  const gameData: GameMoves[] = gameNames
    .map((name) => {
      const info = catalog.versionGroupsByName.get(name);
      return { name, label: info?.label ?? humanize(name), order: info?.order ?? 0 };
    })
    .sort((a, b) => a.order - b.order)
    .map(({ name, label, order: _order }) => {
      const methods = games[name];
      const tables: MoveTableData[] = Object.keys(methods).map((method) => {
        const rowMap = methods[method];
        const rows: MoveRowData[] = [...rowMap.entries()].map(([moveName, level]) => {
          const move = movesByName.get(moveName) ?? null;
          const typeInfo = move ? catalog.typesByName.get(move.type?.name ?? '') : undefined;
          return {
            moveName,
            moveLabel: move ? englishName(move.names as NameInfo[], move.name) : humanize(moveName),
            typeName: move?.type?.name ?? '',
            typeLabel: typeInfo?.label ?? (move ? humanize(move.type?.name ?? '') : '—'),
            category: move?.damage_class ? humanize(move.damage_class.name) : '—',
            power: move?.power ?? null,
            accuracy: move?.accuracy ?? null,
            pp: move?.pp ?? null,
            level,
          };
        });
        return {
          method,
          label: humanize(method),
          rows: sortDefaultRows(rows, method),
        };
      });

      tables.sort((a, b) => {
        const rankA = methodRank(a.method);
        const rankB = methodRank(b.method);
        if (rankA !== rankB) return rankA - rankB;
        if (rankA === 4) return a.label.localeCompare(b.label);
        return 0;
      });

      return { name, label, tables };
    });

  return {
    games: gameData,
    initialGame: gameData.length ? gameData[gameData.length - 1].name : '',
  };
}

export async function getPokemonPageData(
  name: string,
  requestedGame?: string,
): Promise<PokemonPageData | NotFoundResult> {
  const species = await getSpeciesRecord(name);
  if (!species) return notFound;

  const catalog = await getCatalog();

  const defaultVariety = species.varieties?.find((variety) => variety.is_default)?.pokemon;
  let pokemon = await fetchJson<PokemonRecord>(`pokemon/${species.id}`);
  if (!pokemon && defaultVariety) {
    pokemon = await fetchJson<PokemonRecord>(`pokemon/${encodeURIComponent(defaultVariety.name)}`);
  }
  if (!pokemon) return notFound;

  const chainId = idFromUrl(species.evolution_chain?.url);
  const chain = chainId === null ? null : await fetchJson<EvolutionChainRecord>(`evolution-chain/${chainId}`);

  const stats = (pokemon.stats ?? []).map((stat) => {
    const key = stat.stat?.name ?? '';
    const labels: Record<string, string> = {
      hp: 'HP',
      attack: 'Attack',
      defense: 'Defense',
      'special-attack': 'Sp. Atk',
      'special-defense': 'Sp. Def',
      speed: 'Speed',
    };
    return { key, label: labels[key] ?? humanize(key), value: stat.base_stat };
  });

  const types = (pokemon.types ?? [])
    .slice()
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((entry) => ({
      name: entry.type.name,
      label: catalog.typesByName.get(entry.type.name)?.label ?? humanize(entry.type.name),
    }));

  const abilities = (pokemon.abilities ?? [])
    .slice()
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((entry) => ({
      name: entry.ability?.name ?? '',
      label: humanize(entry.ability?.name ?? ''),
      hidden: Boolean(entry.is_hidden),
    }));

  const { games, initialGame } = await buildGameMoves(pokemon, catalog);
  const selectedGame = requestedGame && games.some((game) => game.name === requestedGame) ? requestedGame : initialGame;

  const english = englishName(species.names as NameInfo[], species.name);
  const genus =
    species.genera?.find((entry) => entry.language?.name === 'en')?.genus?.trim() ?? '';
  const flavor = latestEnglishFlavor(species.flavor_text_entries);

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.other?.home?.front_default ??
    pokemon.sprites?.front_default ??
    catalog.spriteUrl(pokemon.id);

  return {
    species,
    pokemon,
    englishName: english,
    genus,
    flavor,
    dex: formatDex(species.id),
    types,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    artwork,
    stats,
    statTotal: stats.reduce((sum, stat) => sum + stat.value, 0),
    abilities,
    evolution: chain?.chain ?? null,
    games,
    initialGame: selectedGame,
  };
}

export async function getMovePageData(name: string): Promise<MovePageData | NotFoundResult> {
  const record = await getMoveRecord(name);
  if (!record) return notFound;
  const catalog = await getCatalog();

  const effect =
    englishEffect(record.effect_entries) ||
    latestEnglishFlavor(record.flavor_text_entries) ||
    '—';

  const learnedBy = uniqueBy(
    (record.learned_by_pokemon ?? [])
      .filter((ref) => {
        const id = idFromUrl(ref.url);
        return id !== null && id < 10000;
      })
      .sort((a, b) => (idFromUrl(a.url) ?? 0) - (idFromUrl(b.url) ?? 0)),
    (ref) => idFromUrl(ref.url) ?? ref.name,
  )
    .map((ref) => cardForPokemonRef(catalog, ref))
    .filter((card): card is CardData => card !== null);

  return {
    record,
    englishName: englishName(record.names as NameInfo[], record.name),
    type: {
      name: record.type?.name ?? '',
      label: catalog.typesByName.get(record.type?.name ?? '')?.label ?? humanize(record.type?.name ?? ''),
    },
    category: record.damage_class ? humanize(record.damage_class.name) : '—',
    effect,
    learnedBy,
  };
}

export async function getAbilityPageData(name: string): Promise<AbilityPageData | NotFoundResult> {
  const record = await getAbilityRecord(name);
  if (!record) return notFound;
  const catalog = await getCatalog();

  const seen = new Map<number, { card: CardData; hidden: boolean }>();
  for (const entry of record.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon.url);
    if (id === null || id >= 10000) continue;
    const card = cardForPokemonRef(catalog, entry.pokemon);
    if (!card) continue;
    const existing = seen.get(id);
    if (existing) existing.hidden = existing.hidden || Boolean(entry.is_hidden);
    else seen.set(id, { card, hidden: Boolean(entry.is_hidden) });
  }

  const pokemon = [...seen.values()].sort((a, b) => a.card.id - b.card.id);

  return {
    record,
    englishName: englishName(record.names as NameInfo[], record.name),
    effect: englishEffect(record.effect_entries) || '—',
    pokemon,
  };
}

export async function getTypePageData(name: string): Promise<TypePageData | NotFoundResult> {
  const catalog = await getCatalog();
  const type = catalog.typesByName.get(name.toLowerCase());
  if (!type) return notFound;

  const seen = new Set<number>();
  const pokemon: CardData[] = [];
  for (const entry of type.pokemon) {
    if (type.pokemonIds.has(entry.id) === false || seen.has(entry.id)) continue;
    seen.add(entry.id);
    const species = catalog.speciesById.get(entry.id);
    if (!species) continue;
    pokemon.push(cardForSpecies(catalog, species));
  }
  pokemon.sort((a, b) => a.id - b.id);

  const moves = uniqueBy(type.moves, (move) => move.name)
    .map((move) => ({ name: move.name, label: humanize(move.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { type, pokemon, moves };
}

export function placeholderImageOrigin(): string {
  return mediaOrigin();
}
