const API_BASE = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

const GENERATION_FALLBACK: Record<string, string> = {
  'generation-i': 'Generation I',
  'generation-ii': 'Generation II',
  'generation-iii': 'Generation III',
  'generation-iv': 'Generation IV',
  'generation-v': 'Generation V',
  'generation-vi': 'Generation VI',
  'generation-vii': 'Generation VII',
  'generation-viii': 'Generation VIII',
  'generation-ix': 'Generation IX',
};

const responseCache = new Map<string, Promise<any>>();
let dexDataPromise: Promise<DexData> | undefined;
let speciesIndexPromise: Promise<SpeciesRef[]> | undefined;
let typeCatalogPromise: Promise<TypeInfo[]> | undefined;
let generationCatalogPromise: Promise<GenerationInfo[]> | undefined;

export type TypeRef = { name: string; display: string };
export type TypeSlot = TypeRef & { slot: number };
export type SpeciesCard = {
  id: number;
  name: string;
  display: string;
  sprite: string;
  types: TypeSlot[];
  generation: string | null;
  generationDisplay: string | null;
  hidden?: boolean;
};

export type DexData = {
  species: SpeciesCard[];
  types: TypeInfo[];
  generations: GenerationInfo[];
};

export type TypeInfo = {
  name: string;
  display: string;
  detail: any;
};

export type GenerationInfo = {
  name: string;
  display: string;
  detail: any;
};

export type SpeciesRef = { id: number; name: string };

function absoluteUrl(urlOrPath: string): string {
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  return `${API_BASE}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
}

export function humanize(name: string): string {
  return String(name ?? '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function englishName(resource: any, fallback = ''): string {
  const entry = (resource?.names ?? []).find((n: any) => n.language?.name === 'en');
  return entry?.name || fallback || humanize(resource?.name ?? '');
}

function idFromUrl(url: string | undefined | null): number | null {
  const match = String(url ?? '').match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

function spriteUrl(id: number): string {
  return `${API_BASE}/media/sprites/pokemon/${id}.png`;
}

async function getJson(urlOrPath: string): Promise<any> {
  const url = absoluteUrl(urlOrPath);
  const cached = responseCache.get(url);
  if (cached) return cached;
  const promise = fetch(url).then(async (response) => {
    if (!response.ok) {
      const error: any = new Error(`API request failed (${response.status}) for ${url}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  });
  responseCache.set(url, promise);
  promise.catch(() => responseCache.delete(url));
  return promise;
}

async function getList(resource: string): Promise<any[]> {
  const data = await getJson(`/api/v2/${resource}/?limit=100000&offset=0`);
  return Array.isArray(data?.results) ? data.results : [];
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function typeDisplayFromCatalog(name: string, catalog?: TypeInfo[]): string {
  return catalog?.find((type) => type.name === name)?.display ?? humanize(name);
}

export async function getSpeciesIndex(): Promise<SpeciesRef[]> {
  if (!speciesIndexPromise) {
    speciesIndexPromise = getList('pokemon-species').then((results) =>
      results
        .map((entry: any) => ({ id: idFromUrl(entry.url), name: String(entry.name) }))
        .filter((entry): entry is SpeciesRef => entry.id !== null)
        .sort((a, b) => a.id - b.id),
    );
  }
  return speciesIndexPromise;
}

export async function getTypeCatalog(): Promise<TypeInfo[]> {
  if (!typeCatalogPromise) {
    typeCatalogPromise = (async () => {
      const results = await getList('type');
      const valid = results.filter((entry: any) => !EXCLUDED_TYPES.has(entry.name));
      const details = await mapLimit(valid, 12, (entry: any) => getJson(entry.url));
      return valid.map((entry: any, index: number) => {
        const detail = details[index];
        const en = (detail?.names ?? []).find((item: any) => item.language?.name === 'en');
        return {
          name: entry.name,
          display: en?.name || humanize(entry.name),
          detail,
        };
      });
    })();
  }
  return typeCatalogPromise;
}

export async function getGenerationCatalog(): Promise<GenerationInfo[]> {
  if (!generationCatalogPromise) {
    generationCatalogPromise = (async () => {
      const results = await getList('generation');
      const details = await mapLimit(results, 12, (entry: any) => getJson(entry.url));
      return results.map((entry: any, index: number) => {
        const detail = details[index];
        const english = (detail?.names ?? []).find((item: any) => item.language?.name === 'en');
        return {
          name: entry.name,
          display: english?.name || GENERATION_FALLBACK[entry.name] || humanize(entry.name),
          detail,
        };
      });
    })();
  }
  return generationCatalogPromise;
}

export async function getDexData(): Promise<DexData> {
  if (!dexDataPromise) {
    dexDataPromise = (async () => {
      const [speciesRefs, types, generations] = await Promise.all([
        getSpeciesIndex(),
        getTypeCatalog(),
        getGenerationCatalog(),
      ]);

      const typesBySpecies = new Map<number, TypeSlot[]>();
      for (const type of types) {
        for (const entry of type.detail?.pokemon ?? []) {
          const id = idFromUrl(entry.pokemon?.url);
          if (!id || id > 10000) continue;
          const list = typesBySpecies.get(id) ?? [];
          list.push({ name: type.name, display: type.display, slot: Number(entry.slot ?? 1) });
          typesBySpecies.set(id, list);
        }
      }

      const generationBySpecies = new Map<number, GenerationInfo>();
      for (const generation of generations) {
        for (const species of generation.detail?.pokemon_species ?? []) {
          const id = idFromUrl(species.url);
          if (id) generationBySpecies.set(id, generation);
        }
      }

      const species: SpeciesCard[] = speciesRefs.map((ref) => {
        const generation = generationBySpecies.get(ref.id);
        const slots = (typesBySpecies.get(ref.id) ?? [])
          .slice()
          .sort((a, b) => a.slot - b.slot || a.name.localeCompare(b.name));
        return {
          id: ref.id,
          name: ref.name,
          display: humanize(ref.name),
          sprite: spriteUrl(ref.id),
          types: slots,
          generation: generation?.name ?? null,
          generationDisplay: generation?.display ?? null,
        };
      });

      return { species, types, generations };
    })();
  }
  return dexDataPromise;
}

export async function getPokemonPageData(rawName: string) {
  const name = decodeURIComponent(rawName);
  const species = await getJson(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`);
  const [pokemon, evolutionChain] = await Promise.all([
    getJson(`/api/v2/pokemon/${species.id}/`),
    species.evolution_chain?.url ? getJson(species.evolution_chain.url) : Promise.resolve(null),
  ]);
  const typeCatalog = await getTypeCatalog();

  const enName = englishName(species);
  const genusEntry = (species.genera ?? []).find((entry: any) => entry.language?.name === 'en');
  const flavor = latestEnglishFlavor(species.flavor_text_entries);

  const typeSlots = (pokemon.types ?? [])
    .slice()
    .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
    .map((entry: any) => ({
      name: entry.type.name,
      display: typeDisplayFromCatalog(entry.type.name, typeCatalog),
    }));

  const statLabels: Record<string, string> = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
  };
  const stats = (pokemon.stats ?? []).map((entry: any) => ({
    name: entry.stat.name,
    label: statLabels[entry.stat.name] || humanize(entry.stat.name),
    value: Number(entry.base_stat),
  }));
  const total = stats.reduce((sum: number, stat: any) => sum + stat.value, 0);

  const abilities = (pokemon.abilities ?? [])
    .slice()
    .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
    .map((entry: any) => ({
      name: entry.ability.name,
      display: humanize(entry.ability.name),
      hidden: Boolean(entry.is_hidden),
    }));

  // Collect every version group this Pokémon learns a move in, plus every move it can learn.
  const groupRefs = new Map<string, string>();
  const moveRefs = new Map<string, string>();
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      const group = detail.version_group;
      if (group?.name && group?.url) groupRefs.set(group.name, group.url);
      const move = moveEntry.move;
      if (move?.name && move?.url) moveRefs.set(move.name, move.url);
    }
  }

  const groupNames = [...groupRefs.keys()];
  const moveNames = [...moveRefs.keys()];
  const [groupDetails, moveDetails] = await Promise.all([
    mapLimit(groupNames, 16, (groupName) => getJson(groupRefs.get(groupName)!)),
    mapLimit(moveNames, 32, (moveName) => getJson(moveRefs.get(moveName)!)),
  ]);

  const moveByName = new Map<string, any>();
  moveNames.forEach((moveName, index) => moveByName.set(moveName, moveDetails[index]));

  const groups = groupNames
    .map((groupName, index) => ({
      name: groupName,
      display: humanize(groupName),
      order: Number(groupDetails[index]?.order ?? 0),
      detail: groupDetails[index],
    }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const methodRank = new Map([
    ['level-up', 0],
    ['machine', 1],
    ['egg', 2],
    ['tutor', 3],
  ]);

  const gameTables = groups.map((group) => {
    const methods = new Map<string, Map<string, { name: string; level: number }>>();

    for (const moveEntry of pokemon.moves ?? []) {
      for (const detail of moveEntry.version_group_details ?? []) {
        if (detail.version_group?.name !== group.name) continue;
        const method = detail.move_learn_method?.name || 'other';
        const moveName = moveEntry.move?.name;
        if (!moveName) continue;
        const level = Number(detail.level_learned_at ?? 0);
        const methodMap = methods.get(method) ?? new Map();
        const existing = methodMap.get(moveName);
        if (!existing || (method === 'level-up' && level < existing.level)) {
          methodMap.set(moveName, { name: moveName, level });
        }
        methods.set(method, methodMap);
      }
    }

    const methodNames = [...methods.keys()].sort((a, b) => {
      const ar = methodRank.get(a);
      const br = methodRank.get(b);
      if (ar !== undefined || br !== undefined) return (ar ?? 99) - (br ?? 99);
      return humanize(a).localeCompare(humanize(b));
    });

    const tables = methodNames.map((method) => {
      const rows = [...(methods.get(method)?.values() ?? [])].map((entry) => {
        const move = moveByName.get(entry.name);
        const power = move?.power;
        const accuracy = move?.accuracy;
        const pp = move?.pp;
        return {
          moveName: entry.name,
          moveDisplay: move ? englishName(move) : humanize(entry.name),
          level: method === 'level-up' ? entry.level : null,
          type: move?.type?.name ?? '',
          typeDisplay: humanize(move?.type?.name ?? ''),
          category: move?.damage_class?.name ? humanize(move.damage_class.name) : '—',
          power: power === null || power === undefined ? '—' : String(power),
          accuracy: accuracy === null || accuracy === undefined ? '—' : String(accuracy),
          pp: pp === null || pp === undefined ? '—' : String(pp),
        };
      });

      rows.sort((a, b) => {
        if (method === 'level-up') {
          return (a.level ?? 0) - (b.level ?? 0) || a.moveDisplay.localeCompare(b.moveDisplay);
        }
        return a.moveDisplay.localeCompare(b.moveDisplay);
      });

      return {
        method,
        display: humanize(method),
        isLevelUp: method === 'level-up',
        rows,
      };
    });

    return { ...group, tables };
  });

  const defaultGroup = gameTables.length ? gameTables[gameTables.length - 1].name : null;

  return {
    id: Number(pokemon.id ?? species.id),
    apiName: String(species.name),
    name: enName || humanize(species.name),
    genus: genusEntry?.genus ?? '',
    flavor: flavor || '—',
    types: typeSlots,
    height: `${(Number(pokemon.height ?? 0) / 10).toFixed(1)} m`,
    weight: `${(Number(pokemon.weight ?? 0) / 10).toFixed(1)} kg`,
    artwork:
      pokemon.sprites?.other?.['official-artwork']?.front_default ||
      pokemon.sprites?.front_default ||
      '',
    stats,
    total,
    abilities,
    evolution: evolutionChain?.chain ? evolutionTree(evolutionChain.chain) : null,
    games: gameTables,
    defaultGroup,
  };
}

export type EvolutionNode = {
  name: string;
  display: string;
  children: EvolutionNode[];
};

function evolutionTree(node: any): any {
  return {
    name: String(node.species?.name ?? ''),
    display: humanize(node.species?.name ?? ''),
    children: (node.evolves_to ?? []).map((child: any) => evolutionTree(child)),
  };
}

export function latestEnglishFlavor(entries: any[] | undefined): string | null {
  const english = (entries ?? []).filter((entry: any) => entry.language?.name === 'en');
  if (!english.length) return null;
  return String(english[english.length - 1].flavor_text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getMovePageData(rawName: string) {
  const name = decodeURIComponent(rawName);
  const move = await getJson(`/api/v2/move/${encodeURIComponent(name)}/`);
  const [speciesIndex, typeCatalog] = await Promise.all([getSpeciesIndex(), getTypeCatalog()]);

  const effectEntry = (move.effect_entries ?? []).find((entry: any) => entry.language?.name === 'en');
  const englishEffect = effectEntry?.short_effect ? String(effectEntry.short_effect).trim() : '';
  const finalEffect = englishEffect || latestEnglishFlavor(move.flavor_text_entries) || '—';

  const learnedBy = cardsFromPokemonRefs(move.learned_by_pokemon ?? [], speciesIndex);

  return {
    apiName: String(move.name),
    name: englishName(move) || humanize(move.name),
    type: move.type?.name ?? '',
    typeDisplay: typeDisplayFromCatalog(move.type?.name ?? '', typeCatalog),
    category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
    power: move.power === null || move.power === undefined ? '—' : String(move.power),
    accuracy: move.accuracy === null || move.accuracy === undefined ? '—' : String(move.accuracy),
    pp: move.pp === null || move.pp === undefined ? '—' : String(move.pp),
    effect: finalEffect,
    learnedBy,
  };
}

export async function getAbilityPageData(rawName: string) {
  const name = decodeURIComponent(rawName);
  const ability = await getJson(`/api/v2/ability/${encodeURIComponent(name)}/`);
  const speciesIndex = await getSpeciesIndex();
  const effectEntry = (ability.effect_entries ?? []).find((entry: any) => entry.language?.name === 'en');

  const bySpecies = new Map<number, { id: number; hidden: boolean }>();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url);
    if (!id || id > 10000) continue;
    const existing = bySpecies.get(id);
    if (!existing) bySpecies.set(id, { id, hidden: Boolean(entry.is_hidden) });
    else if (entry.is_hidden) existing.hidden = true;
  }

  const pokemon = [...bySpecies.values()]
    .sort((a, b) => a.id - b.id)
    .map((entry) => {
      const ref = speciesIndex.find((species) => species.id === entry.id);
      return {
        id: entry.id,
        name: ref?.name ?? String(entry.id),
        display: humanize(ref?.name ?? String(entry.id)),
        sprite: spriteUrl(entry.id),
        types: [],
        generation: null,
        generationDisplay: null,
        hidden: entry.hidden,
      } satisfies SpeciesCard;
    });

  return {
    apiName: String(ability.name),
    name: englishName(ability) || humanize(ability.name),
    effect: effectEntry?.short_effect ? String(effectEntry.short_effect).trim() : '—',
    pokemon,
  };
}

export async function getTypesPageData() {
  const types = await getTypeCatalog();
  return types.map((type) => ({
    name: type.name,
    display: type.display,
    sprite: type.detail?.sprites?.['generation-ix']?.['scarlet-violet']?.name_icon ?? null,
  }));
}

export async function getTypePageData(rawName: string) {
  const name = decodeURIComponent(rawName);
  const [type, typeCatalog, speciesIndex] = await Promise.all([
    getJson(`/api/v2/type/${encodeURIComponent(name)}/`),
    getTypeCatalog(),
    getSpeciesIndex(),
  ]);

  const relationKeys = [
    ['double_damage_to', 'Super effective against'],
    ['half_damage_to', 'Not very effective against'],
    ['no_damage_to', 'No effect against'],
    ['double_damage_from', 'Weak to'],
    ['half_damage_from', 'Resists'],
    ['no_damage_from', 'Immune to'],
  ] as const;

  const relations = relationKeys.map(([key, label]) => {
    const refs = type.damage_relations?.[key] ?? [];
    return {
      label,
      types: refs.map((entry: any) => ({
        name: entry.name,
        display: typeDisplayFromCatalog(entry.name, typeCatalog),
      })),
    };
  });

  const pokemonById = new Map<number, { id: number; hidden: boolean }>();
  for (const entry of type.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url);
    if (!id || id > 10000 || pokemonById.has(id)) continue;
    pokemonById.set(id, { id, hidden: false });
  }

  const pokemon = [...pokemonById.values()]
    .sort((a, b) => a.id - b.id)
    .map((entry) => {
      const ref = speciesIndex.find((species) => species.id === entry.id);
      return {
        id: entry.id,
        name: ref?.name ?? String(entry.id),
        display: humanize(ref?.name ?? String(entry.id)),
        sprite: spriteUrl(entry.id),
        types: [],
        generation: null,
        generationDisplay: null,
      } satisfies SpeciesCard;
    });

  const moves = (type.moves ?? [])
    .map((entry: any) => ({ name: entry.name, display: humanize(entry.name) }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  return {
    apiName: String(type.name),
    name: englishName(type) || humanize(type.name),
    relations,
    pokemon,
    moves,
  };
}

function cardsFromPokemonRefs(refs: any[], speciesIndex: SpeciesRef[]): SpeciesCard[] {
  const byId = new Map<number, { id: number }>();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!id || id > 10000 || byId.has(id)) continue;
    byId.set(id, { id });
  }
  return [...byId.values()]
    .sort((a, b) => a.id - b.id)
    .map((entry) => {
      const species = speciesIndex.find((item) => item.id === entry.id);
      return {
        id: entry.id,
        name: species?.name ?? String(entry.id),
        display: humanize(species?.name ?? String(entry.id)),
        sprite: spriteUrl(entry.id),
        types: [],
        generation: null,
        generationDisplay: null,
      } satisfies SpeciesCard;
    });
}
