// Data layer for the Pokédex app. Everything is fetched from the PokeAPI server
// over HTTP at request time (on the server during SSR, or from the browser during
// client-side navigation). Responses are cached in memory for the lifetime of the
// process / session, which the spec explicitly allows.

export interface NamedRef {
  name: string
  url: string
}

export interface LocalizedName {
  name: string
  language: { name: string }
}

export interface FlavorTextEntry {
  flavor_text: string
  language: { name: string }
}

// ---------------------------------------------------------------------------
// Small helpers

export const idFromUrl = (url: string): number => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? 0)

export const humanize = (name: string): string =>
  name
    .split('-')
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(' ')

export const dexNumber = (id: number): string => `#${String(id).padStart(4, '0')}`

export const collapseWhitespace = (s: string): string => s.replace(/\s+/g, ' ').trim()

export function englishName(names: LocalizedName[] | undefined, fallback: string): string {
  return names?.find((n) => n.language.name === 'en')?.name ?? humanize(fallback)
}

export function latestEnglishFlavorText(entries: FlavorTextEntry[] | undefined): string | null {
  if (!entries) return null
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i]!.language.name === 'en') return collapseWhitespace(entries[i]!.flavor_text)
  }
  return null
}

// ---------------------------------------------------------------------------
// Fetching (with an in-memory cache)

// The API base URL is captured once per app/request by the api-base plugin
// (module state on the server lives for the process, which is fine: the
// value comes from the environment and never changes at runtime).
let resolvedApiBase = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/$/, '')

export function setApiBase(url: string): void {
  resolvedApiBase = url.replace(/\/$/, '')
}

function apiBase(): string {
  return resolvedApiBase
}

const apiCache = new Map<string, Promise<any>>()

export function fetchApi(path: string): Promise<any> {
  let promise = apiCache.get(path)
  if (!promise) {
    promise = $fetch(`${apiBase()}/api/v2${path}`)
    apiCache.set(path, promise)
    // Don't cache failures: the API is a live service.
    promise.catch(() => {
      if (apiCache.get(path) === promise) apiCache.delete(path)
    })
  }
  return promise
}

/** Fetch a single record by id or API name; resolves to null when missing. */
export function fetchRecord(resource: string, key: string | number): Promise<any | null> {
  return fetchApi(`/${resource}/${String(key).toLowerCase()}/`).catch((err) => {
    // A 404 just means the resource doesn't exist; anything else is worth logging.
    if (err?.response?.status !== 404) {
      console.error(`[poke] fetch ${resource}/${key} failed:`, err?.message ?? err)
    }
    return null
  })
}

export const spriteUrl = (id: number): string => `${apiBase()}/media/sprites/pokemon/${id}.png`

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next
      next += 1
      results[i] = await fn(items[i]!)
    }
  })
  await Promise.all(workers)
  return results
}

// ---------------------------------------------------------------------------
// Shared indexes

export interface SpeciesEntry {
  id: number
  name: string
}

export interface SpeciesIndex {
  list: SpeciesEntry[]
  byId: Map<number, SpeciesEntry>
  byName: Map<string, SpeciesEntry>
}

export async function getSpeciesIndex(): Promise<SpeciesIndex> {
  const data = await fetchApi('/pokemon-species/?limit=100000')
  const list: SpeciesEntry[] = (data.results as NamedRef[]).map((r) => ({ id: idFromUrl(r.url), name: r.name }))
  list.sort((a, b) => a.id - b.id)
  return {
    list,
    byId: new Map(list.map((e) => [e.id, e])),
    byName: new Map(list.map((e) => [e.name, e])),
  }
}

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])

export interface TypeInfo {
  id: number
  name: string
  en: string
}

export interface TypeIndex {
  /** The 18 types, in API order. */
  types: TypeInfo[]
  enByName: Map<string, string>
  /** Pokémon (default forms, id < 10000) id -> its types in slot order. */
  typesByPokemonId: Map<number, string[]>
}

export async function getTypeIndex(): Promise<TypeIndex> {
  const list = await fetchApi('/type/?limit=100')
  const names = (list.results as NamedRef[]).map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n))
  const records = await mapLimit(names, 8, (n) => fetchApi(`/type/${n}/`))
  const types: TypeInfo[] = records.map((t) => ({ id: t.id, name: t.name, en: englishName(t.names, t.name) }))
  const enByName = new Map(types.map((t) => [t.name, t.en]))
  const bySlot = new Map<number, { slot: number; type: string }[]>()
  for (const t of records) {
    for (const p of t.pokemon as { slot: number; pokemon: NamedRef }[]) {
      const id = idFromUrl(p.pokemon.url)
      if (id >= 10000) continue
      let arr = bySlot.get(id)
      if (!arr) bySlot.set(id, (arr = []))
      if (!arr.some((e) => e.slot === p.slot)) arr.push({ slot: p.slot, type: t.name })
    }
  }
  const typesByPokemonId = new Map<number, string[]>()
  for (const [id, arr] of bySlot) {
    typesByPokemonId.set(
      id,
      arr.sort((a, b) => a.slot - b.slot).map((e) => e.type),
    )
  }
  return { types, enByName, typesByPokemonId }
}

export interface GenerationIndex {
  generations: { name: string; en: string }[]
  /** species API name -> generation API name */
  speciesGeneration: Map<string, string>
}

export async function getGenerationIndex(): Promise<GenerationIndex> {
  const list = await fetchApi('/generation/?limit=100')
  const records = await mapLimit(list.results as NamedRef[], 8, (r) => fetchApi(`/generation/${r.name}/`))
  records.sort((a, b) => a.id - b.id)
  const generations = records.map((g) => ({ name: g.name as string, en: englishName(g.names, g.name) as string }))
  const speciesGeneration = new Map<string, string>()
  for (const g of records) {
    for (const s of g.pokemon_species as NamedRef[]) speciesGeneration.set(s.name, g.name)
  }
  return { generations, speciesGeneration }
}

/** version group API name -> its `order` field. */
export async function getVersionGroupOrder(): Promise<Map<string, number>> {
  const list = await fetchApi('/version-group/?limit=100')
  const records = await mapLimit(list.results as NamedRef[], 8, (r) => fetchApi(`/version-group/${r.name}/`))
  return new Map(records.map((v) => [v.name as string, v.order as number]))
}

// ---------------------------------------------------------------------------
// Pokémon cards

export interface MoveRow {
  level: number
  name: string
  nameEn: string
  typeName: string
  typeEn: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

export interface EvolutionTreeNode {
  name: string
  children: EvolutionTreeNode[]
}

export interface PokemonCardModel {
  id: number
  /** Humanized species name. */
  name: string
  /** Species API name (for links). */
  speciesName: string
  sprite: string
  hidden: boolean
}

/**
 * Map a list of Pokémon references (as found in move / ability / type data) to
 * species cards: alternate forms (id >= 10000) are dropped, each species appears
 * once, and cards are ordered by dex number.
 */
export async function cardsFromPokemonRefs(
  refs: NamedRef[],
  hidden?: (ref: NamedRef) => boolean,
): Promise<PokemonCardModel[]> {
  const index = await getSpeciesIndex()
  const seen = new Set<number>()
  const cards: PokemonCardModel[] = []
  for (const ref of refs) {
    const id = idFromUrl(ref.url)
    if (id >= 10000 || seen.has(id)) continue
    const species = index.byId.get(id)
    if (!species) continue
    seen.add(id)
    cards.push({
      id,
      name: humanize(species.name),
      speciesName: species.name,
      sprite: spriteUrl(id),
      hidden: hidden?.(ref) ?? false,
    })
  }
  cards.sort((a, b) => a.id - b.id)
  return cards
}
