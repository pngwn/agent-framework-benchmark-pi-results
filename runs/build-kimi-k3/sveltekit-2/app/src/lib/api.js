// Runtime access to the PokeAPI server. Every piece of data comes from the
// live API (API_BASE_URL) at request time — nothing is read at build time.
// Responses are cached in memory for the lifetime of the process/session.

let base = 'http://localhost:9000';

export function setBase(url) {
  if (url) base = String(url).replace(/\/+$/, '');
}

export function getBase() {
  return base;
}

const cache = new Map();

export function api(path, fetcher = fetch) {
  const url = `${base}/api/v2/${String(path).replace(/^\/+/, '')}`;
  let pending = cache.get(url);
  if (!pending) {
    pending = Promise.resolve()
      .then(() => fetcher(url))
      .then((res) => {
        if (!res.ok) {
          const err = new Error(`API request failed: ${res.status} ${url}`);
          err.status = res.status;
          throw err;
        }
        return res.json();
      });
    cache.set(url, pending);
    pending.catch(() => cache.delete(url));
  }
  return pending;
}

export const humanize = (name) =>
  String(name)
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');

export const enName = (names) => names?.find((n) => n.language?.name === 'en')?.name ?? null;

export const idFromUrl = (url) => Number(String(url).replace(/\/+$/, '').split('/').pop());

export const dexNumber = (id) => `#${String(id).padStart(4, '0')}`;

export function latestEnglishFlavor(entries) {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  if (!en.length) return null;
  return en[en.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
}

export const spriteUrl = (pokemonId) => `${getBase()}/media/sprites/pokemon/${pokemonId}.png`;

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

// Every species, ordered by dex number: [{ id, name }]
let speciesIndexPromise;
export function getSpeciesIndex(fetcher) {
  return (speciesIndexPromise ??= api('pokemon-species/?limit=100000', fetcher).then((list) =>
    list.results.map((r) => ({ name: r.name, id: idFromUrl(r.url) })).sort((a, b) => a.id - b.id),
  ));
}

// The 18 types with English names and their Pokémon: [{ id, name, en, pokemon }]
let typesPromise;
export function getTypes(fetcher) {
  return (typesPromise ??= (async () => {
    const list = await api('type/?limit=100', fetcher);
    const wanted = list.results.filter((r) => !EXCLUDED_TYPES.has(r.name));
    const full = await Promise.all(wanted.map((r) => api(`type/${idFromUrl(r.url)}/`, fetcher)));
    return full.map((t) => ({
      id: t.id,
      name: t.name,
      en: enName(t.names) ?? humanize(t.name),
      pokemon: t.pokemon ?? [],
    }));
  })());
}

// Map of species id -> [{ slot, name, en }] for that species' default Pokémon.
let speciesTypesPromise;
export function getSpeciesTypes(fetcher) {
  return (speciesTypesPromise ??= getTypes(fetcher).then((types) => {
    const map = new Map();
    for (const t of types) {
      for (const entry of t.pokemon) {
        const id = idFromUrl(entry.pokemon.url);
        if (id > 9999) continue; // alternate form
        if (!map.has(id)) map.set(id, []);
        map.get(id).push({ slot: entry.slot, name: t.name, en: t.en });
      }
    }
    for (const arr of map.values()) arr.sort((a, b) => a.slot - b.slot);
    return map;
  }));
}

// The nine generations with English names and their species names.
let generationsPromise;
export function getGenerations(fetcher) {
  return (generationsPromise ??= (async () => {
    const list = await api('generation/?limit=100', fetcher);
    const full = await Promise.all(list.results.map((r) => api(`generation/${idFromUrl(r.url)}/`, fetcher)));
    return full.map((g) => ({
      id: g.id,
      name: g.name,
      en: enName(g.names) ?? humanize(g.name),
      species: (g.pokemon_species ?? []).map((s) => s.name),
    }));
  })());
}

export async function getTypeEnglishName(name, fetcher) {
  const types = await getTypes(fetcher);
  const found = types.find((t) => t.name === name);
  if (found) return found.en;
  try {
    const t = await api(`type/${encodeURIComponent(name)}/`, fetcher);
    return enName(t.names) ?? humanize(name);
  } catch {
    return humanize(name);
  }
}

// Build species cards from Pokémon references (e.g. move.learned_by_pokemon).
// Alternate forms (Pokémon IDs above 10000) are excluded; the rest are mapped
// to their species, de-duplicated and ordered by dex number.
export function cardsFromPokemonRefs(refs, speciesIndex) {
  const speciesById = new Map(speciesIndex.map((s) => [s.id, s.name]));
  const byId = new Map();
  for (const ref of refs) {
    const url = ref.url ?? ref.pokemon?.url;
    if (!url) continue;
    const id = idFromUrl(url);
    const speciesName = speciesById.get(id);
    if (!speciesName) continue;
    if (!byId.has(id)) byId.set(id, { id, name: speciesName });
  }
  return [...byId.values()]
    .sort((a, b) => a.id - b.id)
    .map((c) => ({
      ...c,
      human: humanize(c.name),
      dex: dexNumber(c.id),
      sprite: spriteUrl(c.id),
      href: `/pokemon/${c.name}`,
    }));
}
