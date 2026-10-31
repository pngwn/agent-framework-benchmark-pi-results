import process from 'node:process';
import { englishName, humanize, urlId, dexNumber } from '#lib/utils.js';

const API_ORIGIN = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

// Simple in-memory runtime cache. The API is treated as a live service; cached
// entries live only for the lifetime of the server process.
const cache = new Map();

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`API request failed: ${res.status} ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Fetch a resource from the API. `path` is relative to `/api/v2/`, e.g. `pokemon/25/`. */
export function api(path) {
  const url = `${API_ORIGIN}/api/v2/${path.replace(/^\/+/, '')}`;
  let promise = cache.get(url);
  if (!promise) {
    promise = fetchJson(url);
    cache.set(url, promise);
    promise.catch(() => cache.delete(url));
  }
  return promise;
}

/** Absolute URL for a media path returned by the API. */
export function mediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Front sprite URL for a Pokémon id. */
export function spriteUrl(id) {
  return `${API_ORIGIN}/media/sprites/pokemon/${id}.png`;
}

/** Run async `fn` over `items` with limited concurrency, preserving order. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let indexPromise = null;

/**
 * Site-wide index used by the Pokémon list and for mapping Pokémon to their
 * species: all species, the 18 types (with per-Pokémon type slots) and the
 * generations (with their species). Built once per server process.
 */
export function getIndex() {
  if (!indexPromise) {
    indexPromise = buildIndex();
    indexPromise.catch(() => {
      indexPromise = null;
    });
  }
  return indexPromise;
}

async function buildIndex() {
  const [speciesList, typeList, generationList] = await Promise.all([
    api('pokemon-species/?limit=100000'),
    api('type/?limit=100'),
    api('generation/?limit=100')
  ]);

  const typeNames = typeList.results
    .map((t) => t.name)
    .filter((name) => !EXCLUDED_TYPES.has(name));

  const [typeRecords, generationRecords] = await Promise.all([
    Promise.all(typeNames.map((name) => api(`type/${name}/`))),
    Promise.all(generationList.results.map((g) => api(`generation/${g.name}/`)))
  ]);

  // Pokémon id -> [{ slot, name }] of types.
  const typesByPokemonId = new Map();
  for (const type of typeRecords) {
    for (const entry of type.pokemon ?? []) {
      const id = urlId(entry.pokemon.url);
      if (id == null) continue;
      if (!typesByPokemonId.has(id)) typesByPokemonId.set(id, []);
      typesByPokemonId.get(id).push({ slot: entry.slot, name: type.name });
    }
  }

  // Species name -> generation API name.
  const generationBySpecies = new Map();
  for (const generation of generationRecords) {
    for (const species of generation.pokemon_species ?? []) {
      generationBySpecies.set(species.name, generation.name);
    }
  }

  const typeEn = new Map(
    typeRecords.map((t) => [t.name, englishName(t.names, humanize(t.name))])
  );

  const species = speciesList.results
    .map((entry) => {
      const id = urlId(entry.url);
      const types = (typesByPokemonId.get(id) ?? [])
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((t) => ({ name: t.name, en: typeEn.get(t.name) ?? humanize(t.name) }));
      return {
        id,
        name: entry.name,
        human: humanize(entry.name),
        dex: dexNumber(id),
        generation: generationBySpecies.get(entry.name) ?? null,
        types,
        sprite: spriteUrl(id),
        href: `/pokemon/${entry.name}`
      };
    })
    .sort((a, b) => a.id - b.id);

  const types = typeRecords.map((t) => ({
    name: t.name,
    en: englishName(t.names, humanize(t.name))
  }));

  const generations = generationRecords
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((g) => ({ name: g.name, en: englishName(g.names, humanize(g.name)) }));

  return { species, types, generations };
}

/** English name of a type (fetched and cached). */
export async function englishTypeName(name) {
  const type = await api(`type/${name}/`);
  return englishName(type.names, humanize(name));
}

/** Card view model for a species. */
function cardFor(species) {
  return {
    id: species.id,
    name: species.name,
    human: species.human ?? humanize(species.name),
    dex: species.dex ?? dexNumber(species.id),
    sprite: species.sprite ?? spriteUrl(species.id),
    href: `/pokemon/${species.name}`
  };
}

/**
 * Map a list of Pokémon references (as found in move / ability / type data)
 * to species cards: alternate forms (Pokémon id >= 10000) are left out and
 * each species appears once, ordered by dex number.
 */
export async function cardsForPokemonRefs(refs) {
  const index = await getIndex();
  const speciesById = new Map(index.species.map((s) => [s.id, s]));
  const bySpeciesId = new Map();

  for (const ref of refs) {
    const id = urlId(ref.url ?? ref.pokemon?.url);
    if (id == null || id >= 10000) continue;
    if (bySpeciesId.has(id)) continue;
    let species = speciesById.get(id);
    if (!species) {
      // Fallback for a Pokémon not covered by the species index: resolve its
      // species through the Pokémon record.
      try {
        const pokemon = await api(`pokemon/${id}/`);
        const speciesId = urlId(pokemon.species.url) ?? id;
        species =
          speciesById.get(speciesId) ?? {
            id: speciesId,
            name: pokemon.species.name,
            human: humanize(pokemon.species.name)
          };
      } catch {
        continue;
      }
    }
    bySpeciesId.set(id, species);
  }

  return [...bySpeciesId.values()]
    .sort((a, b) => a.id - b.id)
    .map((species) => cardFor(species));
}
