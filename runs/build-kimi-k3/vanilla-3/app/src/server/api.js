// Runtime API client for the local PokeAPI server, with an in-memory cache.
// All app data comes from the API over HTTP at request time; nothing is read
// from disk or embedded at build time.

const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const cache = new Map();

// Fetches and caches a PokeAPI JSON resource. `path` is relative to /api/v2,
// e.g. "/pokemon/25/". Resolves to null on 404.
export function api(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(`${API_BASE}/api/v2${path}`).then(async (res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`API request failed: ${path} -> ${res.status}`);
        return res.json();
      }),
    );
  }
  return cache.get(path);
}

export const idFromUrl = (url) => Number(String(url).match(/\/(\d+)\/?$/)[1]);

// "/api/v2/pokemon/25/" (or an absolute URL for it) -> "/pokemon/25/"
export const apiPath = (url) => new URL(url, API_BASE).pathname.replace(/^\/api\/v2\/?/, '/');

// Runs `fn` over `items` with a concurrency limit, preserving order.
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

// Warms and caches the shared datasets most pages need: the species list, all
// generation / type / version-group records, and every default Pokémon record
// (species id === default Pokémon id).
let warmPromise = null;
export function warm() {
  warmPromise ??= (async () => {
    const [speciesList, generationList, typeList, versionGroupList] = await Promise.all([
      api('/pokemon-species/?limit=10000'),
      api('/generation/?limit=100'),
      api('/type/?limit=100'),
      api('/version-group/?limit=100'),
    ]);
    const [generations, types, versionGroups] = await Promise.all([
      mapLimit(generationList.results, 8, (r) => api(apiPath(r.url))),
      mapLimit(typeList.results, 8, (r) => api(apiPath(r.url))),
      mapLimit(versionGroupList.results, 8, (r) => api(apiPath(r.url))),
    ]);
    const species = speciesList.results
      .map((r) => ({ name: r.name, id: idFromUrl(r.url) }))
      .sort((a, b) => a.id - b.id);
    await mapLimit(species, 64, (s) => api(`/pokemon/${s.id}/`));
    return { species, generations, types, versionGroups };
  })();
  return warmPromise;
}

export const getPokemon = (id) => api(`/pokemon/${id}/`);

// Maps a list of Pokémon references (as they appear in move/ability/type data)
// to one card entry per species, excluding alternate forms (id >= 10000),
// deduplicated and ordered by dex number. `extra` entries keyed by Pokémon url
// are attached to the resulting card.
export async function cardsForPokemonRefs(refs) {
  const bySpecies = new Map();
  await mapLimit(refs, 48, async (ref) => {
    const pokemonRef = ref.pokemon ?? ref;
    const id = idFromUrl(pokemonRef.url);
    if (id >= 10000) return; // alternate forms are out of scope
    const mon = await getPokemon(id);
    if (!mon) return;
    const speciesId = idFromUrl(mon.species.url);
    if (bySpecies.has(speciesId)) return;
    bySpecies.set(speciesId, {
      speciesName: mon.species.name,
      speciesId,
      sprite: mon.sprites?.front_default ?? null,
      extra: ref.extra ?? '',
    });
  });
  return [...bySpecies.values()].sort((a, b) => a.speciesId - b.speciesId);
}
