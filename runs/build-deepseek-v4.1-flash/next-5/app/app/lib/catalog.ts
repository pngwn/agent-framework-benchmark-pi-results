import { fetchJson, fetchList, idFromUrl } from './api';
import {
  GenerationRecord,
  humanize,
  NameInfo,
  Ref,
  TypeRecord,
  VersionGroupRecord,
  englishName,
} from './models';

export interface SpeciesInfo {
  id: number;
  name: string;
  label: string;
}

export interface TypeInfo {
  id: number;
  name: string;
  label: string;
  order: number;
  damageRelations: Record<string, Ref[]>;
  pokemon: { id: number; slot: number; name: string }[];
  pokemonIds: Set<number>;
  moves: Ref[];
}

export interface GenerationInfo {
  id: number;
  name: string;
  label: string;
  speciesNames: string[];
}

export interface VersionGroupInfo {
  name: string;
  label: string;
  order: number;
}

export interface Catalog {
  species: SpeciesInfo[];
  speciesById: Map<number, SpeciesInfo>;
  speciesByName: Map<string, SpeciesInfo>;
  types: TypeInfo[];
  typesByName: Map<string, TypeInfo>;
  typesByPokemonId: Map<number, { name: string; label: string; slot: number }[]>;
  generations: GenerationInfo[];
  generationsByName: Map<string, GenerationInfo>;
  generationBySpeciesName: Map<string, string>;
  versionGroups: VersionGroupInfo[];
  versionGroupsByName: Map<string, VersionGroupInfo>;
  spriteUrl(id: number): string;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let catalogPromise: Promise<Catalog> | null = null;

export function getCatalog(): Promise<Catalog> {
  if (!catalogPromise) {
    catalogPromise = buildCatalog().catch((error) => {
      catalogPromise = null;
      throw error;
    });
  }
  return catalogPromise;
}

type SpeciesListEntry = Ref;
type TypeListEntry = Ref;
type GenerationListEntry = Ref;
type VersionGroupListEntry = Ref;

async function buildCatalog(): Promise<Catalog> {
  const [speciesList, typeList, generationList, versionGroupList] = await Promise.all([
    fetchList<SpeciesListEntry>('pokemon-species'),
    fetchList<TypeListEntry>('type'),
    fetchList<GenerationListEntry>('generation'),
    fetchList<VersionGroupListEntry>('version-group'),
  ]);

  const species: SpeciesInfo[] = speciesList
    .map((entry) => {
      const id = idFromUrl(entry.url);
      if (id === null || id >= 10000) return null;
      return { id, name: entry.name, label: humanize(entry.name) };
    })
    .filter((entry): entry is SpeciesInfo => entry !== null)
    .sort((a, b) => a.id - b.id);

  const speciesById = new Map(species.map((entry) => [entry.id, entry]));
  const speciesByName = new Map(species.map((entry) => [entry.name, entry]));

  const typeEntries = typeList.filter((entry) => !EXCLUDED_TYPES.has(entry.name));
  const typeRecords = await Promise.all(
    typeEntries.map((entry) => {
      const id = idFromUrl(entry.url);
      return id === null ? Promise.resolve(null) : fetchJson<TypeRecord>(`type/${id}`);
    }),
  );

  const types: TypeInfo[] = [];
  const typesByName = new Map<string, TypeInfo>();
  const typesByPokemonId = new Map<number, { name: string; label: string; slot: number }[]>();

  typeRecords.forEach((record, index) => {
    if (!record) return;
    const pokemon = record.pokemon
      .map((entry) => {
        const id = idFromUrl(entry.pokemon.url);
        if (id === null || id >= 10000) return null;
        return { id, slot: entry.slot ?? 1, name: entry.pokemon.name };
      })
      .filter((entry): entry is { id: number; slot: number; name: string } => entry !== null);

    const pokemonIds = new Set(pokemon.map((entry) => entry.id));
    const info: TypeInfo = {
      id: record.id,
      name: record.name,
      label: englishName(record.names as NameInfo[], record.name),
      order: index,
      damageRelations: record.damage_relations ?? {},
      pokemon,
      pokemonIds,
      moves: record.moves ?? [],
    };
    types.push(info);
    typesByName.set(info.name, info);

    for (const entry of pokemon) {
      const list = typesByPokemonId.get(entry.id) ?? [];
      list.push({ name: info.name, label: info.label, slot: entry.slot });
      typesByPokemonId.set(entry.id, list);
    }
  });

  types.sort((a, b) => a.order - b.order);
  for (const list of typesByPokemonId.values()) {
    list.sort((a, b) => a.slot - b.slot);
  }

  const generationRecords = await Promise.all(
    generationList.map((entry) => {
      const id = idFromUrl(entry.url);
      return id === null ? Promise.resolve(null) : fetchJson<GenerationRecord>(`generation/${id}`);
    }),
  );

  const generations: GenerationInfo[] = [];
  const generationsByName = new Map<string, GenerationInfo>();
  const generationBySpeciesName = new Map<string, string>();

  for (const record of generationRecords) {
    if (!record) continue;
    const info: GenerationInfo = {
      id: record.id,
      name: record.name,
      label: englishName(record.names as NameInfo[], record.name),
      speciesNames: (record.pokemon_species ?? []).map((entry) => entry.name),
    };
    generations.push(info);
    generationsByName.set(info.name, info);
    for (const speciesName of info.speciesNames) {
      if (!generationBySpeciesName.has(speciesName)) {
        generationBySpeciesName.set(speciesName, info.name);
      }
    }
  }

  generations.sort((a, b) => a.id - b.id);

  const versionGroupRecords = await Promise.all(
    versionGroupList.map((entry) => {
      const id = idFromUrl(entry.url);
      return id === null ? Promise.resolve(null) : fetchJson<VersionGroupRecord>(`version-group/${id}`);
    }),
  );

  const versionGroups: VersionGroupInfo[] = versionGroupRecords
    .filter((record): record is VersionGroupRecord => record !== null)
    .map((record) => ({ name: record.name, label: humanize(record.name), order: record.order ?? record.id }))
    .sort((a, b) => a.order - b.order);

  const versionGroupsByName = new Map(versionGroups.map((entry) => [entry.name, entry]));

  const origin = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

  return {
    species,
    speciesById,
    speciesByName,
    types,
    typesByName,
    typesByPokemonId,
    generations,
    generationsByName,
    generationBySpeciesName,
    versionGroups,
    versionGroupsByName,
    spriteUrl: (id: number) => `${origin}/media/sprites/pokemon/${id}.png`,
  };
}
