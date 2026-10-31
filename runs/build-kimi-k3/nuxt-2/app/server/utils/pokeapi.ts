// Server-side data layer for the Pokédex app.
//
// Everything is fetched from the live PokeAPI-compatible server at runtime
// (never at build time). Responses are cached in memory for the lifetime of
// the process, which is fine because the API snapshot only changes between
// restarts of the app.

const cache = new Map<string, Promise<any>>()

export function apiBase(): string {
  const config = useRuntimeConfig()
  return String(config.apiBaseUrl || 'http://localhost:9000').replace(/\/+$/, '')
}

export function apiGet(path: string): Promise<any> {
  const url = `${apiBase()}/api/v2${path}`
  let p = cache.get(url)
  if (!p) {
    p = fetch(url)
      .then(async (res) => {
        if (res.status === 404) return null
        if (!res.ok) throw new Error(`PokeAPI error ${res.status} for ${path}`)
        return res.json()
      })
      .catch((err) => {
        cache.delete(url)
        throw err
      })
    cache.set(url, p)
  }
  return p
}

export function idFromUrl(url: string): number {
  const parts = String(url).split('/').filter(Boolean)
  return Number(parts[parts.length - 1])
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}

export function humanizeName(name: string): string {
  return String(name)
    .split('-')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function enName(names: any[] | undefined | null, fallback: string): string {
  return names?.find((n) => n?.language?.name === 'en')?.name ?? humanizeName(fallback)
}

export function collapseWhitespace(text: string): string {
  return String(text).replace(/\s+/g, ' ').trim()
}

export function latestEnFlavor(entries: any[] | undefined | null): string | null {
  const en = (entries ?? []).filter((e) => e?.language?.name === 'en')
  if (!en.length) return null
  return collapseWhitespace(en[en.length - 1]?.flavor_text ?? '')
}

// ---------------------------------------------------------------------------
// Global species index: built once per process, used by most pages.
// ---------------------------------------------------------------------------

export interface SpeciesEntry {
  id: number
  name: string
  generation: string
  types: string[]
}

export interface DexIndex {
  species: SpeciesEntry[]
  speciesByName: Map<string, SpeciesEntry>
  pokemonToSpecies: Map<string, { speciesName: string; speciesId: number }>
  types: { name: string; label: string }[]
  typeLabels: Record<string, string>
  generations: { name: string; label: string }[]
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])

let indexPromise: Promise<DexIndex> | null = null

export function getIndex(): Promise<DexIndex> {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((err) => {
      indexPromise = null
      throw err
    })
  }
  return indexPromise
}

async function buildIndex(): Promise<DexIndex> {
  const list = await apiGet('/pokemon-species?limit=3000')
  const refs: { name: string; url: string }[] = list?.results ?? []
  const records = await mapLimit(refs, 48, (r) => apiGet(`/pokemon-species/${idFromUrl(r.url)}`))

  const typeList = await apiGet('/type?limit=100')
  const typeRefs: { name: string; url: string }[] = (typeList?.results ?? []).filter(
    (t: any) => !EXCLUDED_TYPES.has(t.name),
  )
  const typeRecords = await mapLimit(typeRefs, 8, (t) => apiGet(`/type/${t.name}`))
  const types = typeRefs.map((t, i) => ({ name: t.name, label: enName(typeRecords[i]?.names, t.name) }))
  const typeLabels = Object.fromEntries(types.map((t) => [t.name, t.label]))

  const genList = await apiGet('/generation?limit=100')
  const genRefs: { name: string; url: string }[] = genList?.results ?? []
  const genRecords = await mapLimit(genRefs, 8, (g) => apiGet(`/generation/${g.name}`))
  const generations = genRefs.map((g, i) => ({ name: g.name, label: enName(genRecords[i]?.names, g.name) }))

  // Map every known Pokémon (including alternate forms) to its species, and
  // remember each species' default Pokémon name.
  const pokemonToSpecies = new Map<string, { speciesName: string; speciesId: number }>()
  const defaultPokemonName = new Map<string, string>()
  for (const rec of records) {
    if (!rec) continue
    for (const v of rec.varieties ?? []) {
      pokemonToSpecies.set(v.pokemon.name, { speciesName: rec.name, speciesId: rec.id })
      if (v.is_default) defaultPokemonName.set(rec.name, v.pokemon.name)
    }
  }

  // Types of each Pokémon from the type records (avoids fetching every
  // Pokémon record just to learn its types).
  const typesByPokemon = new Map<string, { slot: number; type: string }[]>()
  for (const tr of typeRecords) {
    if (!tr) continue
    for (const p of tr.pokemon ?? []) {
      const arr = typesByPokemon.get(p.pokemon.name) ?? []
      arr.push({ slot: p.slot, type: tr.name })
      typesByPokemon.set(p.pokemon.name, arr)
    }
  }

  const species: SpeciesEntry[] = records
    .filter(Boolean)
    .map((rec: any) => {
      const def = defaultPokemonName.get(rec.name)
      const speciesTypes = ((def && typesByPokemon.get(def)) || [])
        .sort((a, b) => a.slot - b.slot)
        .map((x) => x.type)
      return { id: rec.id, name: rec.name, generation: rec.generation?.name ?? '', types: speciesTypes }
    })
    .sort((a, b) => a.id - b.id)

  const speciesByName = new Map(species.map((s) => [s.name, s]))
  return { species, speciesByName, pokemonToSpecies, types, typeLabels, generations }
}

// ---------------------------------------------------------------------------
// Mapping Pokémon references (as found in move/ability/type data) to species
// cards. Alternate forms (Pokémon IDs >= 10000) are excluded and species are
// deduplicated and ordered by dex number.
// ---------------------------------------------------------------------------

export interface SpeciesRef {
  id: number
  name: string
}

export async function resolveSpecies(ref: { name: string; url: string }): Promise<SpeciesRef | null> {
  const idx = await getIndex()
  const mapped = idx.pokemonToSpecies.get(ref.name)
  if (mapped) return { id: mapped.speciesId, name: mapped.speciesName }
  // Fallback: ask the Pokémon record for its species.
  const pokemon = await apiGet(`/pokemon/${encodeURIComponent(ref.name)}`)
  if (!pokemon?.species?.url) return null
  return { id: idFromUrl(pokemon.species.url), name: pokemon.species.name }
}

export async function speciesCardsForPokemonRefs(refs: { name: string; url: string }[]): Promise<SpeciesRef[]> {
  const seen = new Set<number>()
  const out: SpeciesRef[] = []
  for (const ref of refs) {
    if (idFromUrl(ref.url) >= 10000) continue
    const s = await resolveSpecies(ref)
    if (!s || seen.has(s.id)) continue
    seen.add(s.id)
    out.push(s)
  }
  out.sort((a, b) => a.id - b.id)
  return out
}
