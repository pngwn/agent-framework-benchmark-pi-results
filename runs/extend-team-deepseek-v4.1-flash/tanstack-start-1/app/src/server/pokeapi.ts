// Server-only access to the PokeAPI server, with a short-lived in-memory cache.
// Everything is fetched at request time; nothing is read or embedded at build time.
import { humanize } from '../lib/format'
import type { CardData, EvolutionNode, IndexEntry, MoveSummary, TypeRef } from '../lib/types'

const TTL_MS = 60_000
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])

export function apiBase(): string {
  return (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '')
}

type Entry = { expires: number; value: Promise<unknown> }
const cache = new Map<string, Entry>()

// Memoizes an async computation for TTL_MS. Concurrent callers share one promise;
// failures are evicted immediately so the next request retries.
function memo<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.expires > now) return hit.value as Promise<T>
  const value = compute()
  cache.set(key, { expires: now + TTL_MS, value })
  value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key)
  })
  if (cache.size > 5000) {
    for (const [k, e] of cache) if (e.expires <= now) cache.delete(k)
  }
  return value
}

class NotFoundError extends Error {}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}/api/v2/${path}`)
  if (res.status === 404) {
    await res.body?.cancel()
    throw new NotFoundError(path)
  }
  if (!res.ok) throw new Error(`PokeAPI ${path} responded ${res.status}`)
  return (await res.json()) as T
}

// Returns null for resources the API doesn't have.
export async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise
  } catch (err) {
    if (err instanceof NotFoundError) return null
    throw err
  }
}

// ---- Raw API shapes (only the fields we use) ----

interface NamedRef {
  name: string
  url: string
}
interface LocalizedName {
  name: string
  language: NamedRef
}
interface ListResponse {
  results: NamedRef[]
}

export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1])

export function englishName(names: LocalizedName[] | undefined, fallback: string): string {
  return names?.find((n) => n.language.name === 'en')?.name ?? humanize(fallback)
}

export function latestEnglish<T extends { language: NamedRef }>(entries: T[] | undefined): T | undefined {
  return entries?.filter((e) => e.language.name === 'en').at(-1)
}

export const collapse = (text: string) => text.replace(/\s+/g, ' ').trim()

function list(resource: string): Promise<NamedRef[]> {
  return memo(`list:${resource}`, async () => (await fetchJson<ListResponse>(`${resource}/?limit=100000`)).results)
}

// ---- Species index ----

export function speciesNames(): Promise<Map<number, string>> {
  return memo('species-names', async () => {
    const results = await list('pokemon-species')
    return new Map(results.map((r) => [idFromUrl(r.url), r.name]))
  })
}

// Maps Pokémon references (which may be alternate forms) to species cards, ordered by
// dex number. Alternate forms (IDs above 10000) are left out.
export async function toCards<T extends { pokemon: NamedRef }>(
  refs: T[],
  extra?: (ref: T) => Partial<CardData>,
): Promise<CardData[]> {
  const species = await speciesNames()
  const cards = new Map<number, CardData>()
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url)
    if (!id || id > 10000 || cards.has(id)) continue
    cards.set(id, { id, name: species.get(id) ?? ref.pokemon.name, ...extra?.(ref) })
  }
  return [...cards.values()].sort((a, b) => a.id - b.id)
}

// ---- Types ----

interface RawType {
  id: number
  name: string
  names: LocalizedName[]
  damage_relations: Record<string, NamedRef[]>
  pokemon: Array<{ slot: number; pokemon: NamedRef }>
  moves: NamedRef[]
}

export function getType(name: string): Promise<RawType> {
  return memo(`type:${name}`, () => fetchJson<RawType>(`type/${encodeURIComponent(name)}`))
}

// The 18 types, in API order, with English names.
export function typeList(): Promise<TypeRef[]> {
  return memo('type-list', async () => {
    const refs = (await list('type')).filter((t) => !EXCLUDED_TYPES.has(t.name))
    const types = await Promise.all(refs.map((t) => getType(t.name)))
    return types.map((t) => ({ name: t.name, label: englishName(t.names, t.name) }))
  })
}

// English names for every type, including the ones left out of lists.
export async function typeLabel(name: string): Promise<string> {
  const known = (await typeList()).find((t) => t.name === name)
  if (known) return known.label
  const type = await orNull(getType(name))
  return type ? englishName(type.names, name) : humanize(name)
}

export async function typeRef(name: string): Promise<TypeRef> {
  return { name, label: await typeLabel(name) }
}

// ---- Generations ----

interface RawGeneration {
  name: string
  names: LocalizedName[]
  pokemon_species: NamedRef[]
}

function getGeneration(name: string): Promise<RawGeneration> {
  return memo(`generation:${name}`, () => fetchJson<RawGeneration>(`generation/${name}`))
}

export function generationList(): Promise<Array<TypeRef & { species: number[] }>> {
  return memo('generation-list', async () => {
    const refs = await list('generation')
    const gens = await Promise.all(refs.map((g) => getGeneration(g.name)))
    return gens.map((g) => ({
      name: g.name,
      label: englishName(g.names, g.name),
      species: g.pokemon_species.map((s) => idFromUrl(s.url)),
    }))
  })
}

// ---- Home index: every species with its default Pokémon's types and generation ----

export function speciesIndex(): Promise<IndexEntry[]> {
  return memo('species-index', async () => {
    const [species, types, generations] = await Promise.all([
      speciesNames(),
      typeList().then((ts) => Promise.all(ts.map((t) => getType(t.name)))),
      generationList(),
    ])
    const slots = new Map<number, Array<{ slot: number; type: string }>>()
    for (const type of types) {
      for (const { slot, pokemon } of type.pokemon) {
        const id = idFromUrl(pokemon.url)
        if (!species.has(id)) continue
        const entry = slots.get(id) ?? []
        entry.push({ slot, type: type.name })
        slots.set(id, entry)
      }
    }
    const genOf = new Map<number, string>()
    for (const g of generations) for (const id of g.species) genOf.set(id, g.name)
    return [...species.entries()]
      .sort(([a], [b]) => a - b)
      .map(([id, name]) => ({
        id,
        name,
        types: (slots.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((s) => s.type),
        generation: genOf.get(id) ?? null,
      }))
  })
}

// ---- Pokémon ----

export interface RawSpecies {
  id: number
  name: string
  names: LocalizedName[]
  genera: Array<{ genus: string; language: NamedRef }>
  flavor_text_entries: Array<{ flavor_text: string; language: NamedRef }>
  evolution_chain: { url: string } | null
}

export interface RawPokemon {
  id: number
  name: string
  height: number
  weight: number
  types: Array<{ slot: number; type: NamedRef }>
  abilities: Array<{ slot: number; is_hidden: boolean; ability: NamedRef }>
  stats: Array<{ base_stat: number; stat: NamedRef }>
  sprites: { front_default: string | null; other?: Record<string, { front_default?: string | null }> }
  moves: Array<{
    move: NamedRef
    version_group_details: Array<{
      level_learned_at: number
      version_group: NamedRef
      move_learn_method: NamedRef
    }>
  }>
}

export function getSpecies(name: string): Promise<RawSpecies> {
  return memo(`species:${name}`, () => fetchJson<RawSpecies>(`pokemon-species/${encodeURIComponent(name)}`))
}

export function getPokemonById(id: number): Promise<RawPokemon> {
  return memo(`pokemon:${id}`, () => fetchJson<RawPokemon>(`pokemon/${id}`))
}

interface RawChainLink {
  species: NamedRef
  evolves_to: RawChainLink[]
}

export function getEvolution(url: string): Promise<EvolutionNode | null> {
  const id = idFromUrl(url)
  return memo(`evolution:${id}`, async () => {
    const chain = await orNull(fetchJson<{ chain: RawChainLink }>(`evolution-chain/${id}`))
    const convert = (link: RawChainLink): EvolutionNode => ({
      name: link.species.name,
      children: link.evolves_to.map(convert),
    })
    return chain ? convert(chain.chain) : null
  })
}

export function versionGroupOrder(name: string): Promise<number> {
  return memo(`version-group:${name}`, async () => {
    const vg = await orNull(fetchJson<{ order: number }>(`version-group/${name}`))
    return vg?.order ?? Number.MAX_SAFE_INTEGER
  })
}

// ---- Moves ----

export interface RawMove {
  name: string
  names: LocalizedName[]
  type: NamedRef | null
  damage_class: NamedRef | null
  power: number | null
  accuracy: number | null
  pp: number | null
  effect_entries: Array<{ short_effect: string; language: NamedRef }>
  flavor_text_entries: Array<{ flavor_text: string; language: NamedRef }>
  learned_by_pokemon: NamedRef[]
}

export function getMove(name: string): Promise<RawMove> {
  return memo(`move:${name}`, () => fetchJson<RawMove>(`move/${encodeURIComponent(name)}`))
}

export async function summarizeMove(move: RawMove): Promise<MoveSummary> {
  return {
    name: move.name,
    label: englishName(move.names, move.name),
    type: move.type ? await typeRef(move.type.name) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
  }
}

// Cached separately so a Pokémon page doesn't keep every full move document alive.
export function moveSummary(name: string): Promise<MoveSummary> {
  return memo(`move-summary:${name}`, async () => summarizeMove(await getMove(name)))
}

// ---- Abilities ----

export interface RawAbility {
  name: string
  names: LocalizedName[]
  effect_entries: Array<{ short_effect: string; language: NamedRef }>
  flavor_text_entries: Array<{ flavor_text: string; language: NamedRef }>
  pokemon: Array<{ is_hidden: boolean; slot: number; pokemon: NamedRef }>
}

export function getAbility(name: string): Promise<RawAbility> {
  return memo(`ability:${name}`, () => fetchJson<RawAbility>(`ability/${encodeURIComponent(name)}`))
}
