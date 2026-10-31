// Higher-level data access built on apiFetch. Derived data is memoized per
// process (the API data can change at any moment, but runtime caching is fine).

import { apiFetch } from './api.js';
import { idFromUrl, enName, humanize } from './format.js';

const memo = (fn) => {
  let pending;
  return () => (pending ??= fn());
};

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

// Every species, ordered by dex number.
export const getSpeciesList = memo(async () => {
  const data = await apiFetch('pokemon-species/?limit=100000');
  return data.results
    .map((r) => ({ name: r.name, id: idFromUrl(r.url) }))
    .sort((a, b) => a.id - b.id);
});

// species id -> species API name
export const getSpeciesNameById = memo(
  async () => new Map((await getSpeciesList()).map((s) => [s.id, s.name])),
);

// The 18 types, in API order, as full type records.
export const getTypes = memo(async () => {
  const list = await apiFetch('type/?limit=100');
  const kept = list.results.filter((r) => !EXCLUDED_TYPES.has(r.name));
  return Promise.all(kept.map((r) => apiFetch(`type/${idFromUrl(r.url)}`)));
});

// type API name -> English name
export const getTypeEnNames = memo(
  async () => new Map((await getTypes()).map((t) => [t.name, enName(t.names, t.name)])),
);

export const typeEnName = async (name) => (await getTypeEnNames()).get(name) ?? humanize(name);

// species id -> types of its default Pokémon, in slot order: [{ slot, type }]
export const getSpeciesTypes = memo(async () => {
  const map = new Map();
  for (const t of await getTypes()) {
    for (const p of t.pokemon) {
      const id = idFromUrl(p.pokemon.url);
      if (id >= 10000) continue; // alternate forms are out of scope
      if (!map.has(id)) map.set(id, []);
      map.get(id).push({ slot: p.slot, type: t.name });
    }
  }
  for (const arr of map.values()) arr.sort((a, b) => a.slot - b.slot);
  return map;
});

// The 9 generations, in API order, as full records.
export const getGenerations = memo(async () => {
  const list = await apiFetch('generation/?limit=100');
  return Promise.all(list.results.map((r) => apiFetch(`generation/${idFromUrl(r.url)}`)));
});

// species id -> generation API name
export const getGenerationOfSpecies = memo(async () => {
  const map = new Map();
  for (const g of await getGenerations()) {
    for (const s of g.pokemon_species) map.set(idFromUrl(s.url), g.name);
  }
  return map;
});

// version group API name -> its `order`
export const getVersionGroupOrder = memo(async () => {
  const list = await apiFetch('version-group/?limit=100');
  const groups = await Promise.all(list.results.map((r) => apiFetch(`version-group/${idFromUrl(r.url)}`)));
  return new Map(groups.map((g) => [g.name, g.order]));
});

// Map Pokémon references (anything with a `.url`, or `{ pokemon: { url } }`) to
// species card models { id, name, human }, excluding alternate forms,
// deduplicated by species and ordered by dex number.
export async function toSpeciesCards(refs) {
  const speciesNameById = await getSpeciesNameById();
  const byId = new Map();
  for (const ref of refs) {
    const url = ref.url ?? ref.pokemon?.url;
    const id = idFromUrl(url);
    if (id >= 10000) continue;
    const name = speciesNameById.get(id);
    if (name && !byId.has(id)) byId.set(id, { id, name, human: humanize(name) });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
