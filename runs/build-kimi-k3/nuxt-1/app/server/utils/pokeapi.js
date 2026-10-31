// Server-side data layer. All data comes from the PokeAPI HTTP server at request time;
// responses are cached in memory for the lifetime of the process.
import { humanize } from '#shared/utils/format'

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])
const MAX_POKEMON_FORM_ID = 10000 // ids at/above this are alternate forms

// ---------------------------------------------------------------------------
// Low-level helpers

function baseUrl(event) {
  // API_BASE_URL at server start wins over the value baked into the build.
  const configured = process.env.API_BASE_URL || useRuntimeConfig(event).public.apiBaseUrl
  return configured.replace(/\/$/, '')
}

export function spriteUrl(event, pokemonId) {
  return `${baseUrl(event)}/media/sprites/pokemon/${pokemonId}.png`
}

export function idFromUrl(url) {
  return Number(url.match(/\/(\d+)\/?$/)[1])
}

export function englishName(names) {
  return names?.find((n) => n.language?.name === 'en')?.name ?? null
}

export function latestEnglishFlavor(entries) {
  const entry = entries?.filter((e) => e.language?.name === 'en').pop()
  return entry ? entry.flavor_text.replace(/\s+/g, ' ').trim() : null
}

export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  })
  await Promise.all(workers)
  return out
}

// Fetch a single API record (or list page), cached by path. Rejections are cached too:
// a 404 stays a 404.
const recordCache = new Map()

export function apiGet(event, path) {
  let promise = recordCache.get(path)
  if (!promise) {
    promise = fetch(`${baseUrl(event)}/api/v2${path}`).then(async (res) => {
      if (!res.ok) {
        const err = new Error(`PokeAPI responded ${res.status} for ${path}`)
        err.statusCode = res.status
        throw err
      }
      return res.json()
    })
    recordCache.set(path, promise)
  }
  return promise
}

// ---------------------------------------------------------------------------
// Shared reference data (built once, cached)

let speciesListPromise = null

/** Every species: [{ id, name }], sorted by id. */
export function getSpeciesList(event) {
  if (!speciesListPromise) {
    speciesListPromise = apiGet(event, '/pokemon-species/?limit=100000').then((data) =>
      data.results.map((r) => ({ id: idFromUrl(r.url), name: r.name })).sort((a, b) => a.id - b.id),
    )
  }
  return speciesListPromise
}

let typesPromise = null

/** The 18 types with English names, damage relations, Pokémon and moves. */
export function getTypes(event) {
  if (!typesPromise) {
    typesPromise = (async () => {
      const list = await apiGet(event, '/type/?limit=100')
      const names = list.results.map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n))
      return mapLimit(names, 6, async (name) => {
        const t = await apiGet(event, `/type/${name}`)
        return {
          name,
          en: englishName(t.names) ?? humanize(name),
          relations: t.damage_relations,
          pokemon: t.pokemon,
          moves: t.moves,
        }
      })
    })()
  }
  return typesPromise
}

let generationsPromise = null

/** Generations with English names and the species introduced in each. */
export function getGenerations(event) {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const list = await apiGet(event, '/generation/?limit=100')
      return mapLimit(list.results, 5, async (r) => {
        const g = await apiGet(event, `/generation/${r.name}`)
        return {
          name: g.name,
          en: englishName(g.names) ?? humanize(g.name),
          speciesNames: g.pokemon_species.map((s) => s.name),
        }
      })
    })()
  }
  return generationsPromise
}

let versionGroupsPromise = null

/** Map of version group name -> order. */
export function getVersionGroupOrders(event) {
  if (!versionGroupsPromise) {
    versionGroupsPromise = (async () => {
      const list = await apiGet(event, '/version-group/?limit=100')
      const groups = await mapLimit(list.results, 8, (r) => apiGet(event, `/version-group/${r.name}`))
      const orders = {}
      for (const g of groups) orders[g.name] = g.order
      return orders
    })()
  }
  return versionGroupsPromise
}

const moveSummaryCache = new Map()

/** Small normalized view of a move, for tables. */
export function getMoveSummary(event, name) {
  let promise = moveSummaryCache.get(name)
  if (!promise) {
    promise = apiGet(event, `/move/${name}`).then((m) => ({
      name: m.name,
      en: englishName(m.names) ?? humanize(m.name),
      type: m.type?.name ?? null,
      category: m.damage_class?.name ?? null,
      power: m.power ?? null,
      accuracy: m.accuracy ?? null,
      pp: m.pp ?? null,
    }))
    moveSummaryCache.set(name, promise)
  }
  return promise
}

// ---------------------------------------------------------------------------
// Composite data

let indexPromise = null

/** The full species index behind the home page. */
export function getIndex(event) {
  if (!indexPromise) {
    indexPromise = (async () => {
      const [species, types, generations] = await Promise.all([
        getSpeciesList(event),
        getTypes(event),
        getGenerations(event),
      ])
      const speciesIds = new Set(species.map((s) => s.id))

      // Types of every species' default Pokémon (default Pokémon share the species id).
      const typesBySpeciesId = new Map()
      for (const t of types) {
        for (const p of t.pokemon) {
          const id = idFromUrl(p.pokemon.url)
          if (id >= MAX_POKEMON_FORM_ID || !speciesIds.has(id)) continue
          const list = typesBySpeciesId.get(id) ?? []
          list.push({ slot: p.slot, name: t.name })
          typesBySpeciesId.set(id, list)
        }
      }

      const generationBySpecies = new Map()
      for (const g of generations) {
        for (const name of g.speciesNames) generationBySpecies.set(name, g.name)
      }

      return {
        types: types.map((t) => ({ name: t.name, en: t.en })),
        generations: generations.map((g) => ({ name: g.name, en: g.en })),
        species: species.map((s) => ({
          id: s.id,
          name: s.name,
          label: humanize(s.name),
          sprite: spriteUrl(event, s.id),
          generation: generationBySpecies.get(s.name) ?? null,
          types: (typesBySpeciesId.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
        })),
      }
    })()
  }
  return indexPromise
}

/**
 * Map Pokémon references (from move/ability/type data) to species cards.
 * Alternate forms (ids >= 10000) are dropped; each species appears once,
 * ordered by dex number. `extra(ref)` may add per-card fields.
 */
export async function cardsFromPokemonRefs(event, refs, extra = () => ({})) {
  const species = await getSpeciesList(event)
  const nameById = new Map(species.map((s) => [s.id, s.name]))
  const byId = new Map()
  for (const ref of refs) {
    const url = ref.url ?? ref.pokemon?.url
    const id = idFromUrl(url)
    if (id >= MAX_POKEMON_FORM_ID || !nameById.has(id)) continue
    const fields = extra(ref) ?? {}
    const existing = byId.get(id)
    byId.set(id, existing ? { ...existing, ...fields, hidden: Boolean(existing.hidden || fields.hidden) } : fields)
  }
  return [...byId.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, fields]) => {
      const name = nameById.get(id)
      return { id, name, label: humanize(name), sprite: spriteUrl(event, id), ...fields }
    })
}
