import { api, apiOrNull, englishName, humanize, idFromUrl } from './api.js';

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
const MAX_DEFAULT_POKEMON_ID = 10000;

let typeCatalogPromise;
let generationCatalogPromise;
let versionCatalogPromise;
let homeDataPromise;

export function getTypeCatalog() {
  if (!typeCatalogPromise) {
    typeCatalogPromise = (async () => {
      const page = await api('/api/v2/type/?limit=100000');
      const entries = page.results.filter((entry) => !EXCLUDED_TYPES.has(entry.name));
      const details = await Promise.all(
        entries.map((entry) => api(`/api/v2/type/${encodeURIComponent(entry.name)}/`)),
      );
      const list = details.map((resource) => ({
        name: resource.name,
        label: englishName(resource),
        resource,
      }));
      return {
        list,
        byName: new Map(list.map((entry) => [entry.name, entry])),
      };
    })().catch((error) => {
      typeCatalogPromise = null;
      throw error;
    });
  }
  return typeCatalogPromise;
}

export function typeLabel(typeCatalog, name) {
  return typeCatalog.byName.get(name)?.label ?? humanize(name);
}

export function getGenerationCatalog() {
  if (!generationCatalogPromise) {
    generationCatalogPromise = (async () => {
      const page = await api('/api/v2/generation/?limit=100000');
      const details = await Promise.all(
        page.results.map((entry) => api(`/api/v2/generation/${encodeURIComponent(entry.name)}/`)),
      );
      const list = details
        .sort((a, b) => a.id - b.id)
        .map((generation) => ({
          name: generation.name,
          label: englishName(generation),
          member: new Set(generation.pokemon_species.map((entry) => entry.name)),
          generation,
        }));
      return {
        list,
        byName: new Map(list.map((item) => [item.name, item])),
      };
    })().catch((error) => {
      generationCatalogPromise = null;
      throw error;
    });
  }
  return generationCatalogPromise;
}

export function getVersionCatalog() {
  if (!versionCatalogPromise) {
    versionCatalogPromise = (async () => {
      const list = await api('/api/v2/version-group/?limit=100000');
      const details = await Promise.all(
        list.results.map((entry) =>
          api(`/api/v2/version-group/${encodeURIComponent(entry.name)}/`),
        ),
      );
      const groups = details
        .filter((detail) => Number.isFinite(detail.order))
        .sort((a, b) => a.order - b.order || a.id - b.id)
        .map((detail) => ({
          name: detail.name,
          label: humanize(detail.name),
          order: detail.order,
        }));
      return {
        list: groups,
        byName: new Map(groups.map((group) => [group.name, group])),
      };
    })().catch((error) => {
      versionCatalogPromise = null;
      throw error;
    });
  }
  return versionCatalogPromise;
}

export function getHomeData() {
  if (!homeDataPromise) {
    homeDataPromise = (async () => {
      const [speciesPage, generations, types] = await Promise.all([
        api('/api/v2/pokemon-species/?limit=100000'),
        getGenerationCatalog(),
        getTypeCatalog(),
      ]);

      const species = speciesPage.results
        .map((entry) => ({
          name: entry.name,
          id: idFromUrl(entry.url),
        }))
        .filter((entry) => Number.isFinite(entry.id))
        .sort((a, b) => a.id - b.id);

      const pokemon = await mapAll(species, 40, (entry) =>
        apiOrNull(`/api/v2/pokemon/${entry.id}/`),
      );

      const generationOf = new Map();
      for (const generation of generations.list) {
        for (const name of generation.member) generationOf.set(name, generation.name);
      }

      return species.map((entry, index) => {
        const resource = pokemon[index];
        const typeNames = resource
          ? [...resource.types]
              .sort((a, b) => a.slot - b.slot)
              .map((slot) => slot.type.name)
          : [];
        return {
          id: entry.id,
          name: entry.name,
          label: humanize(entry.name),
          sprite: resource?.sprites?.front_default ?? null,
          types: typeNames.map((name) => ({
            name,
            label: typeLabel(types, name),
          })),
          generation: generationOf.get(entry.name) ?? null,
        };
      });
    })().catch((error) => {
      homeDataPromise = null;
      throw error;
    });
  }
  return homeDataPromise;
}

async function mapAll(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function pokemonCardFromRef(ref) {
  const resource = await apiOrNull(`/api/v2/pokemon/${encodeURIComponent(ref.name)}/`);
  if (!resource || resource.id > MAX_DEFAULT_POKEMON_ID) return null;
  const speciesId = idFromUrl(resource.species?.url);
  if (!Number.isFinite(speciesId)) return null;
  return {
    id: speciesId,
    name: resource.species.name,
    label: humanize(resource.species.name),
    sprite: resource.sprites?.front_default ?? null,
    types: [],
    pokemon: resource,
  };
}

export async function cardsFromRefs(refs, limit = 32) {
  const cards = await mapAll(refs, limit, (ref) => pokemonCardFromRef(ref));
  return cards.filter(Boolean);
}

export async function cardsFromPokemonEntries(entries, limit = 32) {
  const cards = await mapAll(entries, limit, async (entry) => {
    const card = await pokemonCardFromRef(entry.pokemon);
    return card ? { ...card, isHidden: Boolean(entry.is_hidden) } : null;
  });
  return cards.filter(Boolean);
}
