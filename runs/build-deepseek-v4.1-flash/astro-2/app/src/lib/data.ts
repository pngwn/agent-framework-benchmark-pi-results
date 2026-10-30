import {
  englishName,
  getJson,
  getList,
  humanize,
  idFromUrl,
  mapLimit,
} from './pokeapi';

export type TypeSlot = { name: string; english: string; slot?: number };
export type TypeInfo = { id: number; name: string; english: string };
export type GenerationInfo = { id: number; name: string; english: string };
export type SpeciesRef = { id: number; name: string; humanized: string };
export type HomeEntry = SpeciesRef & {
  generation: string | null;
  types: TypeSlot[];
};

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let typeDetailsPromise: Promise<any[]> | null = null;
let typeListPromise: Promise<TypeInfo[]> | null = null;
let generationDetailsPromise: Promise<any[]> | null = null;
let generationListPromise: Promise<GenerationInfo[]> | null = null;
let speciesListPromise: Promise<SpeciesRef[]> | null = null;
let speciesIndexPromise: Promise<Map<number, SpeciesRef>> | null = null;
let homeIndexPromise: Promise<{
  species: HomeEntry[];
  generations: GenerationInfo[];
  types: TypeInfo[];
}> | null = null;

export function getTypeDetailsRaw(): Promise<any[]> {
  if (!typeDetailsPromise) {
    typeDetailsPromise = (async () => {
      const entries = (await getList('type')).filter((entry) => !EXCLUDED_TYPES.has(entry.name));
      const details = await mapLimit(entries, 8, (entry) => getJson(entry.url));
      return details.sort((a, b) => a.id - b.id);
    })().catch((error) => {
      typeDetailsPromise = null;
      throw error;
    });
  }
  return typeDetailsPromise;
}

export function getTypes(): Promise<TypeInfo[]> {
  if (!typeListPromise) {
    typeListPromise = getTypeDetailsRaw()
      .then((details) =>
        details.map((detail) => ({
          id: detail.id,
          name: detail.name,
          english: englishName(detail, detail.name),
        })),
      )
      .catch((error) => {
        typeListPromise = null;
        throw error;
      });
  }
  return typeListPromise;
}

export function getGenerationDetailsRaw(): Promise<any[]> {
  if (!generationDetailsPromise) {
    generationDetailsPromise = (async () => {
      const entries = await getList('generation');
      const details = await mapLimit(entries, 6, (entry) => getJson(entry.url));
      return details.sort((a, b) => a.id - b.id);
    })().catch((error) => {
      generationDetailsPromise = null;
      throw error;
    });
  }
  return generationDetailsPromise;
}

export function getGenerations(): Promise<GenerationInfo[]> {
  if (!generationListPromise) {
    generationListPromise = getGenerationDetailsRaw()
      .then((details) =>
        details.map((detail) => ({
          id: detail.id,
          name: detail.name,
          english: englishName(detail, detail.name),
        })),
      )
      .catch((error) => {
        generationListPromise = null;
        throw error;
      });
  }
  return generationListPromise;
}

export function getSpeciesList(): Promise<SpeciesRef[]> {
  if (!speciesListPromise) {
    speciesListPromise = (async () => {
      const entries = await getList('pokemon-species');
      return entries
        .map((entry) => {
          const id = idFromUrl(entry.url);
          return { id, name: entry.name, humanized: humanize(entry.name) };
        })
        .filter((entry) => entry.id > 0)
        .sort((a, b) => a.id - b.id);
    })().catch((error) => {
      speciesListPromise = null;
      throw error;
    });
  }
  return speciesListPromise;
}

export function getSpeciesIndex(): Promise<Map<number, SpeciesRef>> {
  if (!speciesIndexPromise) {
    speciesIndexPromise = getSpeciesList()
      .then((species) => new Map(species.map((entry) => [entry.id, entry])))
      .catch((error) => {
        speciesIndexPromise = null;
        throw error;
      });
  }
  return speciesIndexPromise;
}

export function getSpeciesById(id: number): Promise<SpeciesRef | null> {
  return getSpeciesList().then((list) => list.find((entry) => entry.id === id) || null);
}

export function getHomeIndex(): Promise<{
  species: HomeEntry[];
  generations: GenerationInfo[];
  types: TypeInfo[];
}> {
  if (!homeIndexPromise) {
    homeIndexPromise = (async () => {
      const [speciesRefs, generationDetails, typeDetails] = await Promise.all([
        getSpeciesList(),
        getGenerationDetailsRaw(),
        getTypeDetailsRaw(),
      ]);

      const generations: GenerationInfo[] = generationDetails.map((detail) => ({
        id: detail.id,
        name: detail.name,
        english: englishName(detail, detail.name),
      }));
      const types: TypeInfo[] = typeDetails.map((detail) => ({
        id: detail.id,
        name: detail.name,
        english: englishName(detail, detail.name),
      }));

      const generationBySpecies = new Map<number, string>();
      for (const generation of generationDetails) {
        for (const species of generation.pokemon_species || []) {
          generationBySpecies.set(idFromUrl(species.url), generation.name);
        }
      }

      const typesByPokemon = new Map<number, TypeSlot[]>();
      for (const detail of typeDetails) {
        const label = englishName(detail, detail.name);
        for (const entry of detail.pokemon || []) {
          const id = idFromUrl(entry.pokemon?.url || '');
          if (!id || id > 10000) continue;
          const slots = typesByPokemon.get(id) || [];
          slots.push({ name: detail.name, english: label, slot: entry.slot });
          typesByPokemon.set(id, slots);
        }
      }

      const species: HomeEntry[] = speciesRefs.map((entry) => ({
        ...entry,
        generation: generationBySpecies.get(entry.id) || null,
        types: (typesByPokemon.get(entry.id) || []).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)),
      }));

      return { species, generations, types };
    })().catch((error) => {
      homeIndexPromise = null;
      throw error;
    });
  }
  return homeIndexPromise;
}

export async function getTypeDetail(nameOrUrl: string): Promise<any> {
  return getJson(/^https?:\/\//i.test(nameOrUrl) ? nameOrUrl : `/type/${encodeURIComponent(nameOrUrl)}`);
}

export function getVersionGroup(nameOrUrl: string): Promise<any> {
  return getJson(/^https?:\/\//i.test(nameOrUrl) ? nameOrUrl : `version-group/${nameOrUrl}`);
}

export function getMove(nameOrUrl: string): Promise<any> {
  return getJson(/^https?:\/\//i.test(nameOrUrl) ? nameOrUrl : `move/${nameOrUrl}`);
}
