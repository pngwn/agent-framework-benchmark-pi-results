import {
  englishFlavor,
  englishGenus,
  englishName,
  humanize,
  idFromUrl,
  valueOrDash,
} from './format';

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');

type Ref = { name: string; url: string };
type NamedEntry = { name: string; language: { name: string } };

const recordCache = new Map<string, Promise<any>>();

function relativePath(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) {
    const url = new URL(pathOrUrl);
    return `${url.pathname.replace(/^\/api\/v2\/?/, '')}${url.search}`;
  }
  return pathOrUrl.replace(/^\/?api\/v2\/?/, '').replace(/^\//, '');
}

function fetchJson(pathOrUrl: string): Promise<any> {
  const path = relativePath(pathOrUrl);
  let cached = recordCache.get(path);
  if (!cached) {
    cached = (async () => {
      const response = await fetch(`${API_BASE_URL}/api/v2/${path}`);
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`PokeAPI request failed: ${response.status} ${path}`);
      }
      return response.json();
    })().catch((error) => {
      recordCache.delete(path);
      throw error;
    });
    recordCache.set(path, cached);
  }
  return cached;
}

function getRecord(resource: string, key: string | number) {
  return fetchJson(`${resource}/${encodeURIComponent(String(key))}/`);
}

async function getList(resource: string): Promise<Ref[]> {
  const data = await fetchJson(`${resource}/?limit=100000`);
  return data?.results ?? [];
}

async function getByUrl(ref: Ref | undefined | null) {
  return ref ? fetchJson(ref.url) : null;
}

function typeEnglish(entry: NamedEntry[] | undefined, fallback: string) {
  return englishName(entry) ?? humanize(fallback);
}

// ---------------------------------------------------------------------------
// Shared indexes. These are built from live API responses at runtime.

const typeInfosPromise = (async () => {
  const list = await getList('type');
  const allowed = list.filter(
    (ref) => !['stellar', 'unknown', 'shadow'].includes(ref.name),
  );
  return Promise.all(
    allowed.map(async (ref) => {
      const record = await getByUrl(ref);
      return {
        name: ref.name,
        english: typeEnglish(record?.names, ref.name),
        record,
      };
    }),
  );
})();

const generationInfosPromise = (async () => {
  const list = await getList('generation');
  return Promise.all(
    list.map(async (ref) => {
      const record = await getByUrl(ref);
      return {
        name: ref.name,
        english: englishName(record?.names) ?? humanize(ref.name),
        record,
      };
    }),
  );
})();

const speciesIndexPromise = (async () => {
  const list = await getList('pokemon-species');
  const byId = new Map<number, { id: number; name: string }>();
  for (const ref of list) {
    const id = idFromUrl(ref.url);
    if (Number.isFinite(id) && id <= 10000) byId.set(id, { id, name: ref.name });
  }
  return { list, byId };
})();

export function getTypeInfos() {
  return typeInfosPromise;
}

export function getGenerationInfos() {
  return generationInfosPromise;
}

export function spriteUrlForId(id: number) {
  return `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;
}

async function cardSprite(id: number): Promise<string> {
  // The API guarantees this pattern for the shipped front sprites. For a
  // species added by a live-data update, ask the API for its sprite URL.
  if (id <= 1025) return spriteUrlForId(id);
  const pokemon = await getRecord('pokemon', id);
  return (
    pokemon?.sprites?.front_default ??
    pokemon?.sprites?.other?.['official-artwork']?.front_default ??
    spriteUrlForId(id)
  );
}

export type PokemonCard = {
  id: number;
  name: string;
  humanized: string;
  sprite: string;
};

async function cardFromPokemonRef(ref: Ref): Promise<PokemonCard | null> {
  const id = idFromUrl(ref.url);
  if (!Number.isFinite(id) || id > 10000) return null;
  const species = (await speciesIndexPromise).byId.get(id);
  if (!species) return null;
  return {
    id,
    name: species.name,
    humanized: humanize(species.name),
    sprite: await cardSprite(id),
  };
}

async function cardsFromRefs(refs: Ref[] | undefined): Promise<PokemonCard[]> {
  if (!refs?.length) return [];
  const cards = (await Promise.all(refs.map(cardFromPokemonRef))).filter(
    (card): card is PokemonCard => card !== null,
  );
  const unique = new Map<number, PokemonCard>();
  for (const card of cards) unique.set(card.id, card);
  return [...unique.values()].sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------
// List page

export type HomeSpecies = PokemonCard & {
  types: Array<{ name: string; english: string; slot: number }>;
  generation: string | null;
};

export type HomeData = {
  species: HomeSpecies[];
  types: Array<{ name: string; english: string }>;
  generations: Array<{ name: string; english: string }>;
};

const homeDataPromise = (async (): Promise<HomeData> => {
  const [{ list: speciesList, byId }, typeInfos, generationInfos] = await Promise.all([
    speciesIndexPromise,
    typeInfosPromise,
    generationInfosPromise,
  ]);

  const typesByPokemon = new Map<
    number,
    Array<{ name: string; english: string; slot: number }>
  >();
  for (const typeInfo of typeInfos) {
    for (const entry of typeInfo.record?.pokemon ?? []) {
      const ref = entry.pokemon as Ref;
      const id = idFromUrl(ref?.url);
      if (!Number.isFinite(id) || id > 10000 || !byId.has(id)) continue;
      const entries = typesByPokemon.get(id) ?? [];
      entries.push({
        name: typeInfo.name,
        english: typeInfo.english,
        slot: entry.slot ?? 0,
      });
      typesByPokemon.set(id, entries);
    }
  }
  for (const entries of typesByPokemon.values()) {
    entries.sort((a, b) => a.slot - b.slot);
  }

  const generationBySpecies = new Map<number, string>();
  for (const generation of generationInfos) {
    for (const ref of generation.record?.pokemon_species ?? []) {
      const id = idFromUrl(ref.url);
      if (Number.isFinite(id) && id <= 10000 && byId.has(id)) {
        generationBySpecies.set(id, generation.name);
      }
    }
  }

  const species: HomeSpecies[] = [];
  for (const ref of speciesList) {
    const id = idFromUrl(ref.url);
    if (!Number.isFinite(id) || id > 10000) continue;
    species.push({
      id,
      name: ref.name,
      humanized: humanize(ref.name),
      sprite: await cardSprite(id),
      types: typesByPokemon.get(id) ?? [],
      generation: generationBySpecies.get(id) ?? null,
    });
  }

  return {
    species,
    types: typeInfos.map(({ name, english }) => ({ name, english })),
    generations: generationInfos.map(({ name, english }) => ({ name, english })),
  };
})();

export function getHomeData() {
  return homeDataPromise;
}

// ---------------------------------------------------------------------------
// Pokémon page

const statLabels: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

function evolutionNode(node: any): any {
  return {
    name: node?.species?.name ?? '',
    label: humanize(node?.species?.name),
    children: (node?.evolves_to ?? []).map(evolutionNode),
  };
}

const versionGroupsPromise = (async () => {
  const list = await getList('version-group');
  const groups = await Promise.all(
    list.map(async (ref) => {
      const record = await getByUrl(ref);
      return { name: ref.name, order: record?.order ?? 0, label: humanize(ref.name) };
    }),
  );
  return groups.sort((a, b) => a.order - b.order);
})();

export async function getPokemonPage(name: string, gameParam: string | null) {
  const species = await getRecord('pokemon-species', name);
  if (!species) return null;

  const defaultVariety =
    species.varieties?.find((variety: any) => variety.is_default)?.pokemon ??
    species.varieties?.[0]?.pokemon;
  const pokemon = defaultVariety
    ? await getRecord('pokemon', defaultVariety.name)
    : await getRecord('pokemon', species.id);
  if (!pokemon) return null;

  const [typeInfos, evolutionChain, versionGroups] = await Promise.all([
    typeInfosPromise,
    getByUrl(species.evolution_chain),
    versionGroupsPromise,
  ]);
  const typeEnglishByName = new Map(
    typeInfos.map((info) => [info.name, info.english]),
  );

  const displayName = englishName(species.names) ?? humanize(species.name);
  const genus = englishGenus(species.genera) ?? '';
  const flavor = englishFlavor(species.flavor_text_entries) ?? '';

  const types = [...(pokemon.types ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((entry: any) => ({
      name: entry.type.name,
      english: typeEnglishByName.get(entry.type.name) ?? humanize(entry.type.name),
    }));

  const stats = (pokemon.stats ?? []).map((entry: any) => ({
    name: entry.stat.name,
    label: statLabels[entry.stat.name] ?? humanize(entry.stat.name),
    value: entry.base_stat,
  }));
  const statsTotal = stats.reduce((sum: number, stat: any) => sum + stat.value, 0);

  const abilities = [...(pokemon.abilities ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((entry: any) => ({
      name: entry.ability.name,
      label: humanize(entry.ability.name),
      hidden: Boolean(entry.is_hidden),
    }));

  const groupMap = new Map<
    string,
    Array<{ moveName: string; level: number; method: string }>
  >();
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      const groupName = detail.version_group?.name;
      if (!groupName) continue;
      const rows = groupMap.get(groupName) ?? [];
      rows.push({
        moveName: moveEntry.move.name,
        level: detail.level_learned_at ?? 0,
        method: detail.move_learn_method?.name ?? 'other',
      });
      groupMap.set(groupName, rows);
    }
  }

  const groups = versionGroups.filter((group) => groupMap.has(group.name));
  const latestGroup = groups[groups.length - 1]?.name ?? null;
  const selectedGroup =
    gameParam && groupMap.has(gameParam) ? gameParam : latestGroup;

  const tables: Array<{
    method: string;
    label: string;
    rows: Array<{
      level: number;
      moveName: string;
      moveLabel: string;
      type: { name: string; english: string };
      category: string;
      power: number | null;
      accuracy: number | null;
      pp: number | null;
    }>;
  }> = [];

  if (selectedGroup) {
    const baseRows = groupMap.get(selectedGroup) ?? [];
    const moveNames = [...new Set(baseRows.map((row) => row.moveName))];
    const moveRecords = await Promise.all(
      moveNames.map(async (moveName) => [moveName, await getRecord('move', moveName)] as const),
    );
    const movesByName = new Map(moveRecords);

    const byMethod = new Map<string, typeof tables[number]['rows']>();
    const seen = new Set<string>();
    for (const row of baseRows) {
      const key = `${row.method}:${row.moveName}:${row.level}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const move = movesByName.get(row.moveName);
      if (!move) continue;
      const rows = byMethod.get(row.method) ?? [];
      rows.push({
        level: row.level,
        moveName: move.name,
        moveLabel: englishName(move.names) ?? humanize(move.name),
        type: {
          name: move.type?.name ?? '',
          english:
            typeEnglishByName.get(move.type?.name) ??
            humanize(move.type?.name ?? ''),
        },
        category: humanize(move.damage_class?.name),
        power: move.power ?? null,
        accuracy: move.accuracy ?? null,
        pp: move.pp ?? null,
      });
      byMethod.set(row.method, rows);
    }

    for (const [method, rows] of byMethod) {
      tables.push({ method, label: humanize(method), rows });
    }
  }

  return {
    id: species.id,
    name: species.name,
    displayName,
    genus,
    flavor,
    artwork:
      pokemon.sprites?.other?.['official-artwork']?.front_default ??
      pokemon.sprites?.other?.home?.front_default ??
      pokemon.sprites?.front_default ??
      '',
    types,
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    stats,
    statsTotal,
    abilities,
    evolution: evolutionChain?.chain ? evolutionNode(evolutionChain.chain) : null,
    groups: groups.map(({ name, label }) => ({ name, label })),
    selectedGroup,
    tables,
  };
}

// ---------------------------------------------------------------------------
// Move, ability and type pages

export async function getMovePage(name: string) {
  const move = await getRecord('move', name);
  if (!move) return null;
  const [typeInfos, cards] = await Promise.all([
    typeInfosPromise,
    cardsFromRefs(move.learned_by_pokemon),
  ]);
  const typeInfo = typeInfos.find((info) => info.name === move.type?.name);
  const shortEffect =
    move.effect_entries?.find((entry: any) => entry.language.name === 'en')
      ?.short_effect ?? '';
  const flavor = englishFlavor(move.flavor_text_entries) ?? '';

  return {
    name: move.name,
    displayName: englishName(move.names) ?? humanize(move.name),
    type: {
      name: move.type?.name ?? '',
      english: typeInfo?.english ?? humanize(move.type?.name ?? ''),
    },
    category: humanize(move.damage_class?.name),
    power: valueOrDash(move.power),
    accuracy: valueOrDash(move.accuracy),
    pp: valueOrDash(move.pp),
    effect: shortEffect || flavor || '—',
    cards,
  };
}

export async function getAbilityPage(name: string) {
  const ability = await getRecord('ability', name);
  if (!ability) return null;
  const entries = ability.pokemon ?? [];
  const cards = await Promise.all(
    entries.map(async (entry: any) => {
      const card = await cardFromPokemonRef(entry.pokemon);
      return card ? { ...card, hidden: Boolean(entry.is_hidden) } : null;
    }),
  );
  const unique = new Map<number, PokemonCard & { hidden: boolean }>();
  for (const card of cards) if (card) unique.set(card.id, card);

  return {
    name: ability.name,
    displayName: englishName(ability.names) ?? humanize(ability.name),
    effect:
      ability.effect_entries?.find((entry: any) => entry.language.name === 'en')
        ?.short_effect ?? '—',
    cards: [...unique.values()].sort((a, b) => a.id - b.id),
  };
}

export async function getTypes() {
  const infos = await typeInfosPromise;
  return infos.map(({ name, english }) => ({ name, english }));
}

const relationTerms: Array<[string, string]> = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function getTypePage(name: string) {
  const infos = await typeInfosPromise;
  const info = infos.find((item) => item.name === name);
  if (!info) return null;
  const record = info.record;
  const englishByType = new Map(infos.map((item) => [item.name, item.english]));

  const relations = relationTerms.map(([term, field]) => ({
    term,
    types: (record.damage_relations?.[field] ?? []).map((entry: Ref) => ({
      name: entry.name,
      english: englishByType.get(entry.name) ?? humanize(entry.name),
    })),
  }));

  const cards = await cardsFromRefs(
    (record.pokemon ?? []).map((entry: any) => entry.pokemon),
  );
  const moves = (record.moves ?? [])
    .map((entry: Ref) => ({
      name: entry.name,
      label: humanize(entry.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    name: info.name,
    displayName: info.english,
    relations,
    cards,
    moves,
  };
}
