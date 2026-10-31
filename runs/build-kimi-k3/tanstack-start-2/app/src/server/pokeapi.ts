// Server-side data layer. All data comes from the PokeAPI HTTP server at
// API_BASE_URL at request time; responses are cached in memory at runtime.
import {
  DAMAGE_CLASS_LABELS,
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavorText,
  speciesIdFromPokemonUrl,
  STAT_LABELS,
} from '../lib/format'

const BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '')

const cache = new Map<string, Promise<any>>()

/** Fetch a JSON document from the API, with an in-memory runtime cache. */
export function apiFetch(path: string): Promise<any | null> {
  let cached = cache.get(path)
  if (!cached) {
    cached = fetch(`${BASE}${path}`).then((res) => {
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`API request failed: ${path} -> ${res.status}`)
      return res.json()
    })
    cached.catch(() => cache.delete(path))
    cache.set(path, cached)
  }
  return cached
}

/** Fetch a record by its absolute or root-relative API URL. */
function apiFetchUrl(url: string): Promise<any | null> {
  const path = new URL(url, BASE).pathname
  return apiFetch(path)
}

export function spriteUrl(pokemonId: number): string {
  return `${BASE}/media/sprites/pokemon/${pokemonId}.png`
}

// ---------------------------------------------------------------------------
// Shared reference data
// ---------------------------------------------------------------------------

export type SpeciesEntry = { id: number; name: string }

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])

export type TypeInfo = {
  name: string
  en: string
  pokemon: Array<{ id: number; slot: number }>
  moves: string[]
  record: any
}

export type GenerationInfo = {
  name: string
  en: string
  species: string[]
}

let speciesIndexPromise: Promise<{ list: SpeciesEntry[]; byId: Map<number, string> }> | null = null

/** Every species the API lists, in API order. */
export function getSpeciesIndex() {
  if (!speciesIndexPromise) {
    speciesIndexPromise = (async () => {
      const data = await apiFetch('/api/v2/pokemon-species/?limit=100000')
      const list: SpeciesEntry[] = (data?.results ?? []).map((r: any) => ({
        id: idFromUrl(r.url),
        name: r.name,
      }))
      return { list, byId: new Map(list.map((s) => [s.id, s.name])) }
    })()
    speciesIndexPromise.catch(() => (speciesIndexPromise = null))
  }
  return speciesIndexPromise
}

let typesPromise: Promise<TypeInfo[]> | null = null

/** The 18 types, in API order, with their full records. */
export function getTypes(): Promise<TypeInfo[]> {
  if (!typesPromise) {
    typesPromise = (async () => {
      const list = await apiFetch('/api/v2/type/?limit=100')
      const names = (list?.results ?? [])
        .map((r: any) => r.name as string)
        .filter((name: string) => !EXCLUDED_TYPES.has(name))
      const records = await Promise.all(names.map((name: string) => apiFetch(`/api/v2/type/${name}/`)))
      return records
        .filter(Boolean)
        .map((record: any) => ({
          name: record.name,
          en: englishName(record.names, record.name),
          pokemon: (record.pokemon ?? []).map((p: any) => ({
            id: idFromUrl(p.pokemon.url),
            slot: p.slot,
          })),
          moves: (record.moves ?? []).map((m: any) => m.name as string),
          record,
        }))
    })()
    typesPromise.catch(() => (typesPromise = null))
  }
  return typesPromise
}

export async function getTypeEnNames(): Promise<Map<string, string>> {
  const types = await getTypes()
  return new Map(types.map((t) => [t.name, t.en]))
}

let generationsPromise: Promise<GenerationInfo[]> | null = null

/** Every generation, in API order. */
export function getGenerations(): Promise<GenerationInfo[]> {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const list = await apiFetch('/api/v2/generation/?limit=100')
      const names = (list?.results ?? []).map((r: any) => r.name as string)
      const records = await Promise.all(names.map((name: string) => apiFetch(`/api/v2/generation/${name}/`)))
      return records
        .filter(Boolean)
        .map((record: any) => ({
          name: record.name,
          en: englishName(record.names, record.name),
          species: (record.pokemon_species ?? []).map((s: any) => s.name as string),
        }))
    })()
    generationsPromise.catch(() => (generationsPromise = null))
  }
  return generationsPromise
}

let versionGroupsPromise: Promise<Array<{ name: string; order: number }>> | null = null

/** Every version group with its `order`, sorted by `order`. */
export function getVersionGroups() {
  if (!versionGroupsPromise) {
    versionGroupsPromise = (async () => {
      const list = await apiFetch('/api/v2/version-group/?limit=100')
      const ids = (list?.results ?? []).map((r: any) => idFromUrl(r.url))
      const records = await Promise.all(ids.map((id: number) => apiFetch(`/api/v2/version-group/${id}/`)))
      return records
        .filter(Boolean)
        .map((record: any) => ({ name: record.name as string, order: record.order as number }))
        .sort((a, b) => a.order - b.order)
    })()
    versionGroupsPromise.catch(() => (versionGroupsPromise = null))
  }
  return versionGroupsPromise
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

export type HomeSpecies = {
  id: number
  name: string
  generation: string
  types: string[]
  sprite: string
}

export async function getHomeData() {
  const [speciesIndex, types, generations] = await Promise.all([
    getSpeciesIndex(),
    getTypes(),
    getGenerations(),
  ])

  const typesBySpecies = new Map<number, Array<{ slot: number; type: string }>>()
  for (const type of types) {
    for (const p of type.pokemon) {
      if (p.id >= 10000) continue
      const arr = typesBySpecies.get(p.id) ?? []
      arr.push({ slot: p.slot, type: type.name })
      typesBySpecies.set(p.id, arr)
    }
  }

  const generationBySpecies = new Map<string, string>()
  for (const generation of generations) {
    for (const name of generation.species) generationBySpecies.set(name, generation.name)
  }

  const species: HomeSpecies[] = speciesIndex.list.map((s) => ({
    id: s.id,
    name: s.name,
    generation: generationBySpecies.get(s.name) ?? '',
    types: (typesBySpecies.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
    sprite: spriteUrl(s.id),
  }))

  return {
    species,
    types: types.map((t) => ({ name: t.name, en: t.en })),
    generations: generations.map((g) => ({ name: g.name, en: g.en })),
  }
}

// ---------------------------------------------------------------------------
// Pokémon page
// ---------------------------------------------------------------------------

type ChainLink = { name: string; children: ChainLink[] }

function mapChain(link: any): ChainLink {
  return {
    name: link.species.name,
    children: (link.evolves_to ?? []).map(mapChain),
  }
}

export type MoveRow = {
  level: number
  name: string
  apiName: string
  typeName: string
  typeEn: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

export async function getPokemonPage(name: string, game: string | undefined) {
  const species = await apiFetch(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`)
  if (!species) return null

  const defaultVariety =
    (species.varieties ?? []).find((v: any) => v.is_default) ?? (species.varieties ?? [])[0]
  const [pokemon, evolutionChain, versionGroups, typeEnNames] = await Promise.all([
    defaultVariety ? apiFetchUrl(defaultVariety.pokemon.url) : Promise.resolve(null),
    species.evolution_chain ? apiFetchUrl(species.evolution_chain.url) : Promise.resolve(null),
    getVersionGroups(),
    getTypeEnNames(),
  ])
  if (!pokemon) return null

  const orderByName = new Map(versionGroups.map((v) => [v.name, v.order]))
  const gameNames = new Set<string>()
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) gameNames.add(detail.version_group.name)
  }
  const games = [...gameNames]
    .sort((a, b) => (orderByName.get(a) ?? 0) - (orderByName.get(b) ?? 0))
    .map((vgName) => ({ name: vgName, label: humanize(vgName) }))
  const selectedGame =
    game && gameNames.has(game) ? game : (games[games.length - 1]?.name ?? undefined)

  // Collect (move, method, level) rows for the selected version group.
  const rowsByMethod = new Map<string, Array<{ moveName: string; moveUrl: string; level: number }>>()
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group.name !== selectedGame) continue
      const method = detail.move_learn_method.name as string
      const rows = rowsByMethod.get(method) ?? []
      rows.push({ moveName: move.move.name, moveUrl: move.move.url, level: detail.level_learned_at })
      rowsByMethod.set(method, rows)
    }
  }

  // Fetch the move records needed for the tables.
  const uniqueMoves = new Map<string, string>()
  for (const rows of rowsByMethod.values()) {
    for (const row of rows) uniqueMoves.set(row.moveName, row.moveUrl)
  }
  const moveRecords = new Map<string, any>()
  await Promise.all(
    [...uniqueMoves].map(async ([moveName, url]) => {
      moveRecords.set(moveName, await apiFetchUrl(url))
    }),
  )

  const methodNames = [...rowsByMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a)
    const ib = METHOD_ORDER.indexOf(b)
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    }
    return humanize(a).localeCompare(humanize(b))
  })

  const methods = methodNames.map((method) => ({
    name: method,
    label: humanize(method),
    rows: (rowsByMethod.get(method) ?? []).map((row): MoveRow => {
      const record = moveRecords.get(row.moveName)
      const damageClass = record?.damage_class?.name
      return {
        level: row.level,
        name: record ? englishName(record.names, record.name) : humanize(row.moveName),
        apiName: row.moveName,
        typeName: record?.type?.name ?? '',
        typeEn: record?.type?.name ? (typeEnNames.get(record.type.name) ?? humanize(record.type.name)) : '',
        category: damageClass ? (DAMAGE_CLASS_LABELS[damageClass] ?? humanize(damageClass)) : '',
        power: record?.power ?? null,
        accuracy: record?.accuracy ?? null,
        pp: record?.pp ?? null,
      }
    }),
  }))

  const stats = (pokemon.stats ?? []).map((s: any) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat as number,
  }))

  const abilities = [...(pokemon.abilities ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((a: any) => ({ name: a.ability.name, isHidden: a.is_hidden }))

  const types = [...(pokemon.types ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((t: any) => ({
      name: t.type.name,
      en: typeEnNames.get(t.type.name) ?? humanize(t.type.name),
    }))

  return {
    id: species.id,
    name: englishName(species.names, species.name),
    speciesName: species.name,
    genus: (species.genera ?? []).find((g: any) => g.language.name === 'en')?.genus ?? '',
    flavorText: latestEnglishFlavorText(species.flavor_text_entries) ?? '',
    types,
    artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? spriteUrl(species.id),
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    stats,
    statTotal: stats.reduce((sum: number, s: { value: number }) => sum + s.value, 0),
    abilities,
    evolution: evolutionChain?.chain ? mapChain(evolutionChain.chain) : null,
    games,
    selectedGame,
    methods,
  }
}

// ---------------------------------------------------------------------------
// Cards ("Learned by", ability Pokémon, type Pokémon)
// ---------------------------------------------------------------------------

export type CardEntry = { id: number; name: string; sprite: string; hidden: boolean }

/** Map a list of `/pokemon/<id>/` references to species cards, excluding alternate forms. */
async function pokemonRefsToCards(
  refs: Array<{ url: string; hidden: boolean }>,
): Promise<CardEntry[]> {
  const { byId } = await getSpeciesIndex()
  const cards = new Map<number, CardEntry>()
  for (const ref of refs) {
    const id = speciesIdFromPokemonUrl(ref.url)
    if (id === null || cards.has(id)) continue
    const speciesName = byId.get(id)
    if (!speciesName) continue
    cards.set(id, { id, name: speciesName, sprite: spriteUrl(id), hidden: ref.hidden })
  }
  return [...cards.values()].sort((a, b) => a.id - b.id)
}

// ---------------------------------------------------------------------------
// Move page
// ---------------------------------------------------------------------------

export async function getMovePage(name: string) {
  const move = await apiFetch(`/api/v2/move/${encodeURIComponent(name)}/`)
  if (!move) return null
  const typeEnNames = await getTypeEnNames()
  const effect =
    (move.effect_entries ?? []).find((e: any) => e.language.name === 'en')?.short_effect ??
    latestEnglishFlavorText(move.flavor_text_entries)
  const learnedBy = await pokemonRefsToCards(
    (move.learned_by_pokemon ?? []).map((p: any) => ({ url: p.url, hidden: false })),
  )
  const damageClass = move.damage_class?.name
  return {
    name: englishName(move.names, move.name),
    typeName: move.type?.name ?? '',
    typeEn: move.type?.name ? (typeEnNames.get(move.type.name) ?? humanize(move.type.name)) : '',
    category: damageClass ? (DAMAGE_CLASS_LABELS[damageClass] ?? humanize(damageClass)) : '',
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: effect ?? null,
    learnedBy,
  }
}

// ---------------------------------------------------------------------------
// Ability page
// ---------------------------------------------------------------------------

export async function getAbilityPage(name: string) {
  const ability = await apiFetch(`/api/v2/ability/${encodeURIComponent(name)}/`)
  if (!ability) return null
  const effect =
    (ability.effect_entries ?? []).find((e: any) => e.language.name === 'en')?.short_effect ?? null
  const pokemon = await pokemonRefsToCards(
    (ability.pokemon ?? []).map((p: any) => ({ url: p.pokemon.url, hidden: p.is_hidden })),
  )
  return {
    name: englishName(ability.names, ability.name),
    effect,
    pokemon,
  }
}

// ---------------------------------------------------------------------------
// Type pages
// ---------------------------------------------------------------------------

export async function getTypeListPage() {
  const types = await getTypes()
  return { types: types.map((t) => ({ name: t.name, en: t.en })) }
}

const RELATION_TERMS: Array<{ term: string; key: string }> = [
  { term: 'Super effective against', key: 'double_damage_to' },
  { term: 'Not very effective against', key: 'half_damage_to' },
  { term: 'No effect against', key: 'no_damage_to' },
  { term: 'Weak to', key: 'double_damage_from' },
  { term: 'Resists', key: 'half_damage_from' },
  { term: 'Immune to', key: 'no_damage_from' },
]

export async function getTypePage(name: string) {
  const type = await apiFetch(`/api/v2/type/${encodeURIComponent(name)}/`)
  if (!type || EXCLUDED_TYPES.has(type.name)) return null
  const typeEnNames = await getTypeEnNames()
  const relations = RELATION_TERMS.map(({ term, key }) => ({
    term,
    types: (type.damage_relations?.[key] ?? []).map((t: any) => ({
      name: t.name,
      en: typeEnNames.get(t.name) ?? humanize(t.name),
    })),
  }))
  const pokemon = await pokemonRefsToCards(
    (type.pokemon ?? []).map((p: any) => ({ url: p.pokemon.url, hidden: false })),
  )
  const moves = (type.moves ?? [])
    .map((m: any) => ({ name: m.name as string, label: humanize(m.name) }))
    .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
  return {
    name: englishName(type.names, type.name),
    relations,
    pokemon,
    moves,
  }
}
