// Runtime access to the local PokeAPI server. Everything is fetched lazily when
// a request is rendered; repeated requests are served from this in-memory cache.

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

const API_BASE = (
  process.env.API_BASE_URL ||
  import.meta.env.API_BASE_URL ||
  'http://localhost:9000'
).replace(/\/+$/, '');

export const apiBaseUrl = API_BASE;

export function mediaUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

const cache = new Map<string, Promise<any>>();

function normalizedPath(input: string): string {
  let path = input;
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    path = `${url.pathname}${url.search}`;
  }
  if (!path.startsWith('/api/v2')) {
    path = `/api/v2/${path.replace(/^\/+/, '')}`;
  }
  return path;
}

export function apiFetch(input: string): Promise<any> {
  const path = normalizedPath(input);
  let pending = cache.get(path);
  if (!pending) {
    const promise = fetch(`${API_BASE}${path}`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (response.status === 404) throw new NotFoundError(`Not found: ${path}`);
        if (!response.ok) throw new Error(`API request failed (${response.status}): ${path}`);
        return response.json();
      })
      .catch((error) => {
        cache.delete(path);
        throw error;
      });
    cache.set(path, promise);
    pending = promise;
  }
  return pending;
}

export function idFromUrl(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = String(value).match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function humanize(name: string): string {
  return String(name)
    .split('-')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export function englishName(names: any[] | undefined | null, fallback?: string): string {
  const found = Array.isArray(names) ? names.find((item) => item?.language?.name === 'en') : null;
  if (found?.name) return found.name;
  return fallback ? humanize(fallback) : '—';
}

export function englishValue(
  entries: any[] | undefined | null,
  key: string,
  fallback?: string,
): string {
  const found = Array.isArray(entries) ? entries.find((item) => item?.language?.name === 'en') : null;
  if (found?.[key]) return found[key];
  return fallback ?? '—';
}

export function latestEnglishFlavor(entries: any[] | undefined | null): string | null {
  if (!Array.isArray(entries)) return null;
  const english = entries.filter((entry) => entry?.language?.name === 'en');
  const latest = english[english.length - 1];
  if (!latest?.flavor_text) return null;
  return String(latest.flavor_text).replace(/\s+/g, ' ').trim();
}

export function displayNumber(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(Number(value)) ? '—' : String(value);
}

async function apiList(resource: string): Promise<any[]> {
  const data = await apiFetch(`/api/v2/${resource}/?limit=10000`);
  return Array.isArray(data.results) ? data.results : [];
}

export type SpeciesRef = {
  id: number;
  name: string;
  url: string;
};

let speciesIndexPromise: Promise<{
  list: SpeciesRef[];
  byId: Map<number, SpeciesRef>;
  byName: Map<string, SpeciesRef>;
}> | null = null;

export function getSpeciesIndex() {
  if (!speciesIndexPromise) {
    speciesIndexPromise = (async () => {
      const results = await apiList('pokemon-species');
      const list = results
        .map((entry) => ({
          id: idFromUrl(entry.url),
          name: String(entry.name),
          url: String(entry.url),
        }))
        .filter((entry): entry is SpeciesRef => entry.id !== null && entry.id <= 10000)
        .sort((a, b) => a.id - b.id);
      const byId = new Map<number, SpeciesRef>();
      const byName = new Map<string, SpeciesRef>();
      for (const entry of list) {
        byId.set(entry.id, entry);
        byName.set(entry.name.toLowerCase(), entry);
      }
      return { list, byId, byName };
    })().catch((error) => {
      speciesIndexPromise = null;
      throw error;
    });
  }
  return speciesIndexPromise;
}

export type GenerationInfo = {
  id: number;
  name: string;
  label: string;
  speciesIds: Set<number>;
};

let generationsPromise: Promise<{
  list: GenerationInfo[];
  bySpeciesId: Map<number, GenerationInfo>;
  byName: Map<string, GenerationInfo>;
}> | null = null;

export function getGenerations() {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const refs = await apiList('generation');
      const records = await Promise.all(refs.map((ref) => apiFetch(ref.url)));
      const list: GenerationInfo[] = records
        .map((record) => {
          const speciesIds = new Set<number>();
          for (const species of record.pokemon_species ?? []) {
            const id = idFromUrl(species.url);
            if (id !== null && id <= 10000) speciesIds.add(id);
          }
          return {
            id: Number(record.id),
            name: String(record.name),
            label: englishName(record.names, record.name),
            speciesIds,
          };
        })
        .sort((a, b) => a.id - b.id);
      const bySpeciesId = new Map<number, GenerationInfo>();
      const byName = new Map<string, GenerationInfo>();
      for (const generation of list) {
        byName.set(generation.name.toLowerCase(), generation);
        for (const speciesId of generation.speciesIds) {
          bySpeciesId.set(speciesId, generation);
        }
      }
      return { list, bySpeciesId, byName };
    })().catch((error) => {
      generationsPromise = null;
      throw error;
    });
  }
  return generationsPromise;
}

export type TypeInfo = {
  id: number;
  name: string;
  label: string;
  order: number;
  pokemon: any[];
  moves: any[];
  damageRelations: any;
};

let typesPromise: Promise<{
  list: TypeInfo[];
  byName: Map<string, TypeInfo>;
  pokemonTypes: Map<number, { name: string; label: string; slot: number; order: number }[]>;
}> | null = null;

export function getTypes() {
  if (!typesPromise) {
    typesPromise = (async () => {
      const refs = (await apiList('type')).filter((ref) => !EXCLUDED_TYPES.has(ref.name));
      const records = await Promise.all(refs.map((ref) => apiFetch(ref.url)));
      const list: TypeInfo[] = records.map((record, index) => ({
        id: Number(record.id),
        name: String(record.name),
        label: englishName(record.names, record.name),
        order: index,
        pokemon: Array.isArray(record.pokemon) ? record.pokemon : [],
        moves: Array.isArray(record.moves) ? record.moves : [],
        damageRelations: record.damage_relations ?? {},
      }));
      const byName = new Map<string, TypeInfo>();
      const pokemonTypes = new Map<
        number,
        { name: string; label: string; slot: number; order: number }[]
      >();
      for (const type of list) {
        byName.set(type.name.toLowerCase(), type);
        for (const entry of type.pokemon) {
          const id = idFromUrl(entry?.pokemon?.url);
          if (id === null || id > 10000) continue;
          const values = pokemonTypes.get(id) ?? [];
          if (!values.some((value) => value.name === type.name)) {
            values.push({
              name: type.name,
              label: type.label,
              slot: Number(entry.slot) || 0,
              order: type.order,
            });
            values.sort((a, b) => a.slot - b.slot || a.order - b.order);
          }
          pokemonTypes.set(id, values);
        }
      }
      return { list, byName, pokemonTypes };
    })().catch((error) => {
      typesPromise = null;
      throw error;
    });
  }
  return typesPromise;
}

export async function getType(name: string): Promise<TypeInfo> {
  const { byName } = await getTypes();
  const type = byName.get(String(name).toLowerCase());
  if (!type) throw new NotFoundError(`Unknown type: ${name}`);
  return type;
}

export type HomeSpecies = {
  id: number;
  name: string;
  displayName: string;
  generation: string | null;
  types: { name: string; label: string; slot: number }[];
};

export async function getHomeData() {
  const [species, generations, types] = await Promise.all([
    getSpeciesIndex(),
    getGenerations(),
    getTypes(),
  ]);
  const list: HomeSpecies[] = species.list.map((entry) => ({
    id: entry.id,
    name: entry.name,
    displayName: humanize(entry.name),
    generation: generations.bySpeciesId.get(entry.id)?.name ?? null,
    types: types.pokemonTypes.get(entry.id) ?? [],
  }));
  return {
    list,
    generations: generations.list,
    types: types.list,
  };
}

export type PokemonPageData = {
  species: any;
  pokemon: any;
  id: number;
  speciesName: string;
  englishName: string;
  genus: string;
  flavorText: string;
  artwork: string | null;
  types: { name: string; label: string }[];
  abilities: { name: string; label: string; hidden: boolean; slot: number }[];
  stats: { label: string; value: number }[];
  statTotal: number;
  evolutionChain: any;
  versionGroups: { name: string; label: string; order: number }[];
  selectedGame: string;
  moveTables: {
    methodName: string;
    label: string;
    columns: string[];
    rows: {
      level?: number | null;
      moveName: string;
      moveLabel: string;
      typeName: string;
      typeLabel: string;
      category: string;
      power: number | null;
      accuracy: number | null;
      pp: number | null;
    }[];
  }[];
};

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export function statLabel(name: string): string {
  return STAT_LABELS[name] ?? humanize(name);
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export async function getPokemonPage(
  speciesName: string,
  selectedGameParam?: string | null,
): Promise<PokemonPageData> {
  const species = await apiFetch(`/api/v2/pokemon-species/${encodeURIComponent(speciesName)}`);
  const id = idFromUrl(species.url) ?? Number(species.id);
  const pokemon = await apiFetch(`/api/v2/pokemon/${id}/`);
  const typeIndex = await getTypes();

  const english = englishName(species.names, species.name);
  const genus = englishValue(species.genera, 'genus', '—');
  const flavorText = latestEnglishFlavor(species.flavor_text_entries) ?? '—';
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ??
    pokemon.sprites?.front_default ??
    null;

  const typeValues = [...(pokemon.types ?? [])]
    .sort((a, b) => (Number(a.slot) || 0) - (Number(b.slot) || 0))
    .map((entry) => {
      const name = String(entry.type?.name ?? '');
      return { name, label: typeIndex.byName.get(name.toLowerCase())?.label ?? humanize(name) };
    });

  const abilities = [...(pokemon.abilities ?? [])]
    .sort((a, b) => (Number(a.slot) || 0) - (Number(b.slot) || 0))
    .map((entry) => ({
      name: String(entry.ability?.name ?? ''),
      label: humanize(String(entry.ability?.name ?? '')),
      hidden: Boolean(entry.is_hidden),
      slot: Number(entry.slot) || 0,
    }));

  const stats = (pokemon.stats ?? []).map((entry: any) => ({
    label: statLabel(String(entry.stat?.name ?? '')),
    value: Number(entry.base_stat) || 0,
  }));
  const statTotal = stats.reduce((sum: number, stat: any) => sum + stat.value, 0);

  const chain = await apiFetch(species.evolution_chain.url);

  // Games in which this Pokémon learns moves, ordered by version group order.
  const versionGroupNames = new Set<string>();
  const moveDetails = new Map<
    string,
    { method: string; level: number | null; name: string; versionGroup: string }
  >();
  for (const moveEntry of pokemon.moves ?? []) {
    const moveName = String(moveEntry.move?.name ?? '');
    for (const detail of moveEntry.version_group_details ?? []) {
      const group = String(detail.version_group?.name ?? '');
      if (!group) continue;
      versionGroupNames.add(group);
      const method = String(detail.move_learn_method?.name ?? '');
      const level = Number(detail.level_learned_at);
      const key = `${moveName}|${group}|${method}|${Number.isFinite(level) ? level : ''}`;
      moveDetails.set(key, {
        method,
        level: Number.isFinite(level) ? level : null,
        name: moveName,
        versionGroup: group,
      });
    }
  }

  const groups = await Promise.all(
    [...versionGroupNames].map(async (name) => {
      const record = await apiFetch(`/api/v2/version-group/${encodeURIComponent(name)}`);
      return { name, label: humanize(name), order: Number(record.order) || 0 };
    }),
  );
  groups.sort((a, b) => a.order - b.order);

  let selectedGame = selectedGameParam ? String(selectedGameParam) : '';
  if (!groups.some((group) => group.name === selectedGame)) {
    selectedGame = groups.length ? groups[groups.length - 1].name : '';
  }

  const selectedDetails = [...moveDetails.values()].filter(
    (detail) => detail.versionGroup === selectedGame,
  );

  // Fetch every move's details once. The API cache makes repeated games cheap.
  const uniqueMoveNames = [...new Set(selectedDetails.map((detail) => detail.name))];
  const moveRecords = new Map<string, any>();
  await Promise.all(
    uniqueMoveNames.map(async (name) => {
      moveRecords.set(name, await apiFetch(`/api/v2/move/${encodeURIComponent(name)}`));
    }),
  );

  const methodNames = [...new Set(selectedDetails.map((detail) => detail.method))].sort((a, b) => {
    const ai = METHOD_ORDER.indexOf(a);
    const bi = METHOD_ORDER.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.localeCompare(b);
  });

  const moveTables = methodNames
    .map((methodName) => {
      const rows = selectedDetails
        .filter((detail) => detail.method === methodName)
        .map((detail) => {
          const record = moveRecords.get(detail.name);
          const typeName = String(record?.type?.name ?? '');
          return {
            level: methodName === 'level-up' ? detail.level : undefined,
            moveName: detail.name,
            moveLabel: englishName(record?.names, detail.name),
            typeName,
            typeLabel: typeIndex.byName.get(typeName.toLowerCase())?.label ?? humanize(typeName),
            category: record?.damage_class?.name
              ? humanize(String(record.damage_class.name))
              : '—',
            power: record?.power ?? null,
            accuracy: record?.accuracy ?? null,
            pp: record?.pp ?? null,
          };
        });

      rows.sort((a, b) => {
        if (methodName === 'level-up') {
          const levelDiff = (a.level ?? 0) - (b.level ?? 0);
          if (levelDiff !== 0) return levelDiff;
        }
        return a.moveLabel.localeCompare(b.moveLabel) || a.moveName.localeCompare(b.moveName);
      });

      return {
        methodName,
        label: humanize(methodName),
        columns:
          methodName === 'level-up'
            ? ['Level', 'Move', 'Type', 'Category', 'Power', 'Accuracy', 'PP']
            : ['Move', 'Type', 'Category', 'Power', 'Accuracy', 'PP'],
        rows,
      };
    })
    .filter((table) => table.rows.length > 0);

  return {
    species,
    pokemon,
    id,
    speciesName: String(species.name),
    englishName: english,
    genus,
    flavorText,
    artwork,
    types: typeValues,
    abilities,
    stats,
    statTotal,
    evolutionChain: chain.chain,
    versionGroups: groups,
    selectedGame,
    moveTables,
  };
}

export function speciesInfoFromId(
  id: number,
  speciesIndex: { byId: Map<number, SpeciesRef> },
): SpeciesRef {
  return (
    speciesIndex.byId.get(id) ?? {
      id,
      name: '',
      url: '',
    }
  );
}

export type RelatedPokemonEntry = {
  id: number;
  name: string;
  displayName: string;
  hidden?: boolean;
};

export async function getMovePage(name: string) {
  const move = await apiFetch(`/api/v2/move/${encodeURIComponent(name)}`);
  const species = await getSpeciesIndex();
  const typeIndex = await getTypes();
  const typeName = String(move.type?.name ?? '');
  const shortEffect = englishValue(move.effect_entries, 'short_effect', '');
  const flavor = latestEnglishFlavor(move.flavor_text_entries);
  const effect = shortEffect && shortEffect !== '—' ? shortEffect : flavor ?? '—';

  const seen = new Set<number>();
  const pokemon: RelatedPokemonEntry[] = [];
  for (const entry of move.learned_by_pokemon ?? []) {
    const id = idFromUrl(entry.url);
    if (id === null || id > 10000 || seen.has(id)) continue;
    seen.add(id);
    const speciesEntry = species.byId.get(id);
    const apiName = speciesEntry?.name ?? String(entry.name);
    pokemon.push({ id, name: apiName, displayName: humanize(apiName) });
  }
  pokemon.sort((a, b) => a.id - b.id);

  return {
    move,
    englishName: englishName(move.names, move.name),
    typeName,
    typeLabel: typeIndex.byName.get(typeName.toLowerCase())?.label ?? humanize(typeName),
    category: move.damage_class?.name ? humanize(String(move.damage_class.name)) : '—',
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect,
    pokemon,
  };
}

export async function getAbilityPage(name: string) {
  const ability = await apiFetch(`/api/v2/ability/${encodeURIComponent(name)}`);
  const species = await getSpeciesIndex();
  const effect = englishValue(ability.effect_entries, 'short_effect', '—');

  const byId = new Map<number, RelatedPokemonEntry>();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry?.pokemon?.url);
    if (id === null || id > 10000) continue;
    const existing = byId.get(id);
    if (existing) {
      existing.hidden = existing.hidden || Boolean(entry.is_hidden);
      continue;
    }
    const speciesEntry = species.byId.get(id);
    const apiName = speciesEntry?.name ?? String(entry.pokemon?.name ?? '');
    byId.set(id, {
      id,
      name: apiName,
      displayName: humanize(apiName),
      hidden: Boolean(entry.is_hidden),
    });
  }
  const pokemon = [...byId.values()].sort((a, b) => a.id - b.id);

  return {
    ability,
    englishName: englishName(ability.names, ability.name),
    effect,
    pokemon,
  };
}

export async function getTypePage(name: string) {
  const type = await getType(name);
  const species = await getSpeciesIndex();
  const typeIndex = await getTypes();

  const byId = new Map<number, RelatedPokemonEntry>();
  for (const entry of type.pokemon) {
    const id = idFromUrl(entry?.pokemon?.url);
    if (id === null || id > 10000) continue;
    const speciesEntry = species.byId.get(id);
    const apiName = speciesEntry?.name ?? String(entry.pokemon?.name ?? '');
    byId.set(id, { id, name: apiName, displayName: humanize(apiName) });
  }
  const pokemon = [...byId.values()].sort((a, b) => a.id - b.id);

  const seenMoves = new Set<string>();
  const moves = type.moves
    .filter((entry) => {
      if (!entry?.name || seenMoves.has(entry.name)) return false;
      seenMoves.add(entry.name);
      return true;
    })
    .map((entry) => ({ name: String(entry.name), label: humanize(String(entry.name)) }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.name.localeCompare(b.name));

  const relations = [
    ['Super effective against', type.damageRelations.double_damage_to ?? []],
    ['Not very effective against', type.damageRelations.half_damage_to ?? []],
    ['No effect against', type.damageRelations.no_damage_to ?? []],
    ['Weak to', type.damageRelations.double_damage_from ?? []],
    ['Resists', type.damageRelations.half_damage_from ?? []],
    ['Immune to', type.damageRelations.no_damage_from ?? []],
  ].map(([term, entries]: any) => ({
    term: String(term),
    types: (entries as any[]).map((entry) => ({
      name: String(entry.name),
      label: typeIndex.byName.get(String(entry.name).toLowerCase())?.label ?? humanize(entry.name),
    })),
  }));

  return {
    type,
    englishName: type.label,
    relations,
    pokemon,
    moves,
  };
}
