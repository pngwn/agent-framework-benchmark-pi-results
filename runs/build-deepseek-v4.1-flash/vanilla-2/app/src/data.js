import {
  api,
  englishName,
  extractId,
  humanize,
  isAlternateFormId,
} from './api.js';

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let speciesPromise;
let typesPromise;
let generationsPromise;

export function loadSpecies() {
  if (!speciesPromise) {
    speciesPromise = api('/pokemon-species/?limit=100000').then((data) => {
      const refs = (data.results || [])
        .map((ref) => ({ name: ref.name, url: ref.url, id: extractId(ref.url) }))
        .filter((ref) => Number.isFinite(ref.id))
        .sort((a, b) => a.id - b.id);
      return { refs, byId: new Map(refs.map((ref) => [ref.id, ref])) };
    });
  }
  return speciesPromise;
}

export function loadTypes() {
  if (!typesPromise) {
    typesPromise = api('/type/?limit=1000').then(async (data) => {
      const details = await Promise.all((data.results || []).map((ref) => api(ref.url)));
      const all = details.map((type) => ({
        ...type,
        label: englishName(type.names, type.name),
      }));
      const canonical = all.filter((type) => !EXCLUDED_TYPES.has(type.name));
      return { all, canonical };
    });
  }
  return typesPromise;
}

export function loadGenerations() {
  if (!generationsPromise) {
    generationsPromise = api('/generation/?limit=100').then(async (data) => {
      const details = await Promise.all((data.results || []).map((ref) => api(ref.url)));
      const generations = details
        .map((generation) => ({
          ...generation,
          label: englishName(generation.names, generation.name),
        }))
        .sort((a, b) => a.id - b.id);

      const bySpecies = new Map();
      for (const generation of generations) {
        for (const species of generation.pokemon_species || []) {
          const id = extractId(species.url);
          if (id !== null) bySpecies.set(id, generation.name);
        }
      }
      return { generations, bySpecies };
    });
  }
  return generationsPromise;
}

export function buildSpeciesTypeMap(canonicalTypes) {
  const bySpecies = new Map();

  for (const type of canonicalTypes) {
    for (const entry of type.pokemon || []) {
      const id = extractId(entry?.pokemon?.url);
      if (id === null || isAlternateFormId(id)) continue;

      const list = bySpecies.get(id) || [];
      const typeInfo = {
        apiName: type.name,
        label: type.label || humanize(type.name),
        slot: Number(entry.slot) || 0,
      };
      if (!list.some((item) => item.apiName === typeInfo.apiName)) list.push(typeInfo);
      bySpecies.set(id, list);
    }
  }

  for (const list of bySpecies.values()) list.sort((a, b) => a.slot - b.slot);
  return bySpecies;
}

export function speciesIdsFromPokemonRefs(refs) {
  const ids = new Set();
  for (const entry of refs || []) {
    const pokemon = entry?.pokemon || entry;
    const id = extractId(pokemon?.url);
    if (id === null || isAlternateFormId(id)) continue;
    ids.add(id);
  }
  return [...ids].sort((a, b) => a - b);
}

export function speciesRefsByIds(ids, species) {
  return ids.map((id) => species.byId.get(id)).filter(Boolean);
}
