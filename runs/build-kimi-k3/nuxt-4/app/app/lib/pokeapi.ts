// Data access layer for the PokeAPI server. Everything is fetched over HTTP at
// request time; responses are cached in memory (per environment: the Nitro
// server during SSR, the browser during client-side navigation).

export interface NamedRef {
  name: string
  url: string
}

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])

/** mr-mime -> Mr Mime, thunder-punch -> Thunder Punch */
export const humanize = (name: string): string =>
  name
    .split('-')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ')

export const idFromUrl = (url: string): number => {
  const m = url.match(/\/(\d+)\/?$/)
  return m ? Number(m[1]) : NaN
}

interface LocalizedName {
  name: string
  language: { name: string }
}

export const englishName = (names?: LocalizedName[] | null): string | null =>
  names?.find((n) => n.language.name === 'en')?.name ?? null

interface FlavorEntry {
  flavor_text: string
  language: { name: string }
}

/** Last English flavor text entry, with all whitespace runs collapsed. */
export const latestEnFlavor = (entries?: FlavorEntry[] | null): string | null => {
  const en = (entries ?? []).filter((e) => e.language.name === 'en')
  const last = en[en.length - 1]
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null
}

export const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim()

// --- cached, concurrency-limited fetching -----------------------------------

const cache = new Map<string, Promise<any>>()
const MAX_CONCURRENT = 24
let active = 0
const waiters: Array<() => void> = []

async function limited<T>(fn: () => Promise<T>): Promise<T> {
  while (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve))
  }
  active++
  try {
    return await fn()
  } finally {
    active--
    waiters.shift()?.()
  }
}

/** Fetch a PokeAPI path (e.g. `/pokemon/25/`). Returns null on 404. */
export function api(base: string, path: string): Promise<any> {
  const url = `${base.replace(/\/$/, '')}/api/v2${path}`
  let hit = cache.get(url)
  if (!hit) {
    hit = limited(async () => {
      const res = await fetch(url)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`API request failed: ${url} -> ${res.status}`)
      return await res.json()
    })
    cache.set(url, hit)
  }
  return hit
}

export const spriteUrl = (base: string, id: number): string =>
  `${base.replace(/\/$/, '')}/media/sprites/pokemon/${id}.png`

// --- shared indexes ----------------------------------------------------------

export interface TypeInfo {
  name: string
  english: string
}

const typesCache = new Map<string, Promise<TypeInfo[]>>()

/** The 18 types, in API order, with English names. */
export function getTypes(base: string): Promise<TypeInfo[]> {
  let p = typesCache.get(base)
  if (!p) {
    p = (async () => {
      const list = await api(base, '/type/?limit=100')
      const records = await Promise.all(
        (list?.results ?? [])
          .filter((t: NamedRef) => !EXCLUDED_TYPES.has(t.name))
          .map((t: NamedRef) => api(base, `/type/${t.name}/`)),
      )
      return records
        .filter(Boolean)
        .sort((a: any, b: any) => a.id - b.id)
        .map((t: any) => ({ name: t.name, english: englishName(t.names) ?? humanize(t.name) }))
    })()
    typesCache.set(base, p)
  }
  return p
}

export interface SpeciesTypeSlot {
  name: string
  english: string
  slot: number
}

export interface SpeciesEntry {
  id: number
  name: string
  human: string
  generation: string | null
  types: SpeciesTypeSlot[]
}

export interface SpeciesRef {
  id: number
  name: string
  human: string
}

export interface PokeIndex {
  entries: SpeciesEntry[]
  types: TypeInfo[]
  generations: { name: string; english: string }[]
  speciesById: Record<number, SpeciesRef>
  typeEnglish: Record<string, string>
}

const indexCache = new Map<string, Promise<PokeIndex>>()

/** Aggregated index of every species with types and generation. */
export function getIndex(base: string): Promise<PokeIndex> {
  let p = indexCache.get(base)
  if (!p) {
    p = buildIndex(base)
    indexCache.set(base, p)
  }
  return p
}

async function buildIndex(base: string): Promise<PokeIndex> {
  const [speciesList, types, generationList] = await Promise.all([
    api(base, '/pokemon-species/?limit=100000'),
    getTypes(base),
    api(base, '/generation/?limit=100'),
  ])
  const typeEnglish: Record<string, string> = Object.fromEntries(types.map((t) => [t.name, t.english]))

  // pokemon id -> its type slots (a species' default pokemon shares its id)
  const typeRecords = await Promise.all(types.map((t) => api(base, `/type/${t.name}/`)))
  const pokemonTypes = new Map<number, SpeciesTypeSlot[]>()
  for (const t of typeRecords) {
    for (const entry of t?.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon.url)
      const arr = pokemonTypes.get(id) ?? []
      if (!arr.some((x) => x.name === t.name)) {
        arr.push({ name: t.name, english: typeEnglish[t.name] ?? humanize(t.name), slot: entry.slot })
      }
      pokemonTypes.set(id, arr)
    }
  }

  const generationRecords = (
    await Promise.all((generationList?.results ?? []).map((g: NamedRef) => api(base, `/generation/${g.name}/`)))
  )
    .filter(Boolean)
    .sort((a: any, b: any) => a.id - b.id)
  const generations = generationRecords.map((g: any) => ({
    name: g.name,
    english: englishName(g.names) ?? humanize(g.name),
  }))
  const speciesGeneration = new Map<string, string>()
  for (const g of generationRecords) {
    for (const s of g.pokemon_species ?? []) speciesGeneration.set(s.name, g.name)
  }

  const entries: SpeciesEntry[] = (speciesList?.results ?? [])
    .map((s: NamedRef) => {
      const id = idFromUrl(s.url)
      const typeSlots = (pokemonTypes.get(id) ?? []).slice().sort((a, b) => a.slot - b.slot)
      return {
        id,
        name: s.name,
        human: humanize(s.name),
        generation: speciesGeneration.get(s.name) ?? null,
        types: typeSlots,
      }
    })
    .sort((a, b) => a.id - b.id)

  const speciesById: Record<number, SpeciesRef> = Object.fromEntries(
    entries.map((e) => [e.id, { id: e.id, name: e.name, human: e.human }]),
  )

  return { entries, types, generations, speciesById, typeEnglish }
}

/**
 * Map a list of Pokémon references (as used by moves, abilities and types) to
 * their species, dropping alternate forms (IDs above 10000, which have no
 * matching species) and duplicates. Sorted by dex number.
 */
export function speciesCardsForRefs(index: PokeIndex, refs: NamedRef[]): SpeciesRef[] {
  const seen = new Set<number>()
  const out: SpeciesRef[] = []
  for (const ref of refs ?? []) {
    const species = index.speciesById[idFromUrl(ref.url)]
    if (!species || seen.has(species.id)) continue
    seen.add(species.id)
    out.push(species)
  }
  return out.sort((a, b) => a.id - b.id)
}
