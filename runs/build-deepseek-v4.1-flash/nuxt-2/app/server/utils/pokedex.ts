/* Server-side access to the live PokeAPI service and shared shaping helpers. */

type Json = any

const responseCache = new Map<string, Promise<Json>>()

let typesPromise: Promise<TypeInfo[]> | null = null
let generationsPromise: Promise<GenerationInfo[]> | null = null
let versionGroupsPromise: Promise<VersionGroupInfo[]> | null = null
let speciesPromise: Promise<SpeciesInfo[]> | null = null

export interface TypeInfo {
  id: number
  name: string
  englishName: string
  pokemon: { slot: number; pokemon: { name: string; url: string } }[]
  moves: { name: string; url: string }[]
  damageRelations: Record<string, { name: string; url: string }[]>
}

export interface GenerationInfo {
  id: number
  name: string
  englishName: string
  speciesIds: number[]
}

export interface VersionGroupInfo {
  id: number
  name: string
  label: string
  order: number
}

export interface SpeciesInfo {
  id: number
  name: string
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])

export function apiBase(): string {
  return (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '')
}

export function idFromUrl(url: string | undefined | null): number | null {
  const match = String(url ?? '').match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : null
}

export function humanize(name: string | null | undefined): string {
  if (!name) return '—'
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function englishName(resource: Json): string {
  const entry = resource?.names?.find((name: Json) => name.language?.name === 'en')
  return entry?.name || humanize(resource?.name)
}

export function latestFlavorText(entries: Json[] | undefined): string {
  const english = (entries ?? []).filter((entry) => entry.language?.name === 'en')
  const latest = english[english.length - 1]
  return String(latest?.flavor_text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function englishShortEffect(resource: Json): string {
  const entry = resource?.effect_entries?.find((effect: Json) => effect.language?.name === 'en')
  const shortEffect = entry?.short_effect?.trim()
  if (shortEffect) return shortEffect
  return latestFlavorText(resource?.flavor_text_entries) || '—'
}

export function padDex(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

export async function apiRequest(path: string): Promise<Json | null> {
  const url = /^https?:\/\//.test(path)
    ? path
    : `${apiBase()}/api/v2/${path.replace(/^\/+/, '')}`

  let pending = responseCache.get(url)
  if (!pending) {
    pending = fetch(url, { headers: { accept: 'application/json' } }).then(async (response) => {
      if (response.status === 404) return null
      if (!response.ok) throw new Error(`PokeAPI request failed (${response.status}): ${url}`)
      return response.json()
    })
    responseCache.set(url, pending)
    pending.catch(() => responseCache.delete(url))
  }
  return pending
}

async function resourceIndex(resource: string): Promise<Json[]> {
  const data = await apiRequest(`${resource}/?limit=100000&offset=0`)
  return Array.isArray(data?.results) ? data.results : []
}

export async function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await mapper(items[index], index)
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

export function getSpecies(): Promise<SpeciesInfo[]> {
  if (!speciesPromise) {
    speciesPromise = (async () => {
      const entries = await resourceIndex('pokemon-species')
      return entries
        .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name }))
        .filter((entry): entry is SpeciesInfo => entry.id !== null)
        .sort((a, b) => a.id - b.id)
    })()
    speciesPromise.catch(() => {
      speciesPromise = null
    })
  }
  return speciesPromise
}

export function getTypes(): Promise<TypeInfo[]> {
  if (!typesPromise) {
    typesPromise = (async () => {
      const entries = (await resourceIndex('type')).filter((entry) => !EXCLUDED_TYPES.has(entry.name))
      const records = await mapLimit(entries, 8, (entry) => apiRequest(`type/${entry.name}`))
      return records.filter(Boolean).map((record) => ({
        id: record.id,
        name: record.name,
        englishName: englishName(record),
        pokemon: record.pokemon ?? [],
        moves: record.moves ?? [],
        damageRelations: record.damage_relations ?? {},
      }))
    })()
    typesPromise.catch(() => {
      typesPromise = null
    })
  }
  return typesPromise
}

export function getGenerations(): Promise<GenerationInfo[]> {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const entries = await resourceIndex('generation')
      const records = await mapLimit(entries, 9, (entry) => apiRequest(`generation/${entry.name}`))
      return records.filter(Boolean).map((record) => ({
        id: record.id,
        name: record.name,
        englishName: englishName(record),
        speciesIds: (record.pokemon_species ?? [])
          .map((species: Json) => idFromUrl(species.url))
          .filter((id: number | null): id is number => id !== null),
      }))
    })()
    generationsPromise.catch(() => {
      generationsPromise = null
    })
  }
  return generationsPromise
}

export function getVersionGroups(): Promise<VersionGroupInfo[]> {
  if (!versionGroupsPromise) {
    versionGroupsPromise = (async () => {
      const entries = await resourceIndex('version-group')
      const records = await mapLimit(entries, 8, (entry) => apiRequest(`version-group/${entry.name}`))
      return records.filter(Boolean).map((record) => ({
        id: record.id,
        name: record.name,
        label: humanize(record.name),
        order: Number(record.order ?? record.id ?? 0),
      }))
    })()
    versionGroupsPromise.catch(() => {
      versionGroupsPromise = null
    })
  }
  return versionGroupsPromise
}

export function typeLookup(types: TypeInfo[]): Map<string, TypeInfo> {
  return new Map(types.map((type) => [type.name, type]))
}

export function pokemonTypesBySpecies(types: TypeInfo[]): Map<number, { name: string; englishName: string; slot: number }[]> {
  const result = new Map<number, { name: string; englishName: string; slot: number }[]>()
  for (const type of types) {
    for (const entry of type.pokemon) {
      const id = idFromUrl(entry.pokemon?.url)
      if (!id || id > 10000) continue
      const list = result.get(id) ?? []
      if (!list.some((item) => item.name === type.name)) {
        list.push({ name: type.name, englishName: type.englishName, slot: entry.slot ?? 0 })
      }
      result.set(id, list)
    }
  }
  for (const list of result.values()) list.sort((a, b) => a.slot - b.slot)
  return result
}

export interface CardData {
  id: number
  dex: string
  slug: string
  name: string
  sprite: string
  types?: { name: string; englishName: string }[]
  hidden?: boolean
}

export function makeCards(
  ids: number[],
  species: SpeciesInfo[],
  options: {
    typeMap?: Map<number, { name: string; englishName: string; slot: number }[]>
    hiddenIds?: Set<number>
  } = {},
): CardData[] {
  const speciesById = new Map(species.map((entry) => [entry.id, entry]))
  const unique = [...new Set(ids)]
    .filter((id) => id <= 10000 && speciesById.has(id))
    .sort((a, b) => a - b)

  return unique.map((id) => {
    const entry = speciesById.get(id)!
    const card: CardData = {
      id,
      dex: padDex(id),
      slug: entry.name,
      name: humanize(entry.name),
      sprite: `${apiBase()}/media/sprites/pokemon/${id}.png`,
    }
    const types = options.typeMap?.get(id)
    if (types) card.types = types.map((type) => ({ name: type.name, englishName: type.englishName }))
    if (options.hiddenIds?.has(id)) card.hidden = true
    return card
  })
}
