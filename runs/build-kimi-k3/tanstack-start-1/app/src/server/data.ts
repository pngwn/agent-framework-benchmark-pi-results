import { createServerFn } from '@tanstack/react-start'
import {
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from '../lib/format'

// ---------------------------------------------------------------------------
// Low-level API access with an in-memory cache (runtime only, never at build).
// ---------------------------------------------------------------------------

const cache = new Map<string, Promise<any>>()

function apiBase(): string {
  return (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '')
}

function fetchJson(url: string): Promise<any> {
  let cached = cache.get(url)
  if (!cached) {
    cached = fetch(url)
      .then((res) => {
        if (res.status === 404) return null
        if (!res.ok) throw new Error(`API request failed: ${url} (${res.status})`)
        return res.json()
      })
      .catch((err) => {
        // Don't cache failures: the API may come back (or change) later.
        cache.delete(url)
        throw err
      })
    cache.set(url, cached)
  }
  return cached
}

/** Fetch an API resource by path, e.g. apiResource('/pokemon/25'). */
function apiResource(path: string): Promise<any> {
  return fetchJson(`${apiBase()}/api/v2${path}`)
}

/** Fetch a full (absolute) API URL as returned inside API records. */
function apiUrl(url: string): Promise<any> {
  return fetchJson(url)
}

/** Fetch every page of a list endpoint. */
async function apiList(resource: string): Promise<Array<{ name: string; url: string }>> {
  const first = await apiResource(`/${resource}?limit=100000`)
  return first?.results ?? []
}

// ---------------------------------------------------------------------------
// Shared, cached lookups
// ---------------------------------------------------------------------------

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])
/** Pokemon ids at or above this value are alternate forms and out of scope. */
const ALT_FORM_ID = 10000

let typeRecordsPromise: Promise<any[]> | null = null

/** All 18 main types, in API order. */
function getTypeRecords(): Promise<any[]> {
  if (!typeRecordsPromise) {
    typeRecordsPromise = (async () => {
      const list = await apiList('type')
      const main = list.filter((t) => !EXCLUDED_TYPES.has(t.name))
      const records = await Promise.all(
        main.map((t) => apiResource(`/type/${t.name}`)),
      )
      return records.filter(Boolean)
    })()
  }
  return typeRecordsPromise
}

let generationsPromise: Promise<any[]> | null = null

function getGenerationRecords(): Promise<any[]> {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const list = await apiList('generation')
      const records = await Promise.all(
        list.map((g) => apiResource(`/generation/${g.name}`)),
      )
      return records.filter(Boolean)
    })()
  }
  return generationsPromise
}

let versionGroupsPromise: Promise<Map<string, number>> | null = null

/** Map of version-group API name -> its `order`. */
function getVersionGroupOrders(): Promise<Map<string, number>> {
  if (!versionGroupsPromise) {
    versionGroupsPromise = (async () => {
      const list = await apiList('version-group')
      const records = await Promise.all(
        list.map((vg) => apiResource(`/version-group/${vg.name}`).catch(() => null)),
      )
      const map = new Map<string, number>()
      for (const record of records) {
        if (record) map.set(record.name, record.order ?? 0)
      }
      return map
    })()
  }
  return versionGroupsPromise
}

let speciesIndexPromise: Promise<Array<{ name: string; id: number }>> | null = null

/** Every species (name + dex id), sorted by id. */
function getSpeciesIndex(): Promise<Array<{ name: string; id: number }>> {
  if (!speciesIndexPromise) {
    speciesIndexPromise = (async () => {
      const list = await apiList('pokemon-species')
      return list
        .map((entry) => ({ name: entry.name, id: idFromUrl(entry.url) ?? 0 }))
        .filter((entry) => entry.id > 0)
        .sort((a, b) => a.id - b.id)
    })()
  }
  return speciesIndexPromise
}

// ---------------------------------------------------------------------------
// Card helpers
// ---------------------------------------------------------------------------

export interface CardData {
  id: number
  name: string // species API name (link target)
  display: string // humanized species name
  sprite: string
  hidden?: boolean
}

/** Map a list of pokemon references ({pokemon: {name, url}, ...}) to species cards. */
async function toCards(
  entries: Array<{ name: string; url: string; hidden?: boolean }>,
): Promise<CardData[]> {
  const species = await getSpeciesIndex()
  const speciesNameById = new Map(species.map((s) => [s.id, s.name]))
  const seen = new Set<number>()
  const cards: CardData[] = []
  for (const entry of entries) {
    const id = idFromUrl(entry.url)
    if (id === null || id >= ALT_FORM_ID || seen.has(id)) continue
    seen.add(id)
    const speciesName = speciesNameById.get(id) ?? entry.name
    cards.push({
      id,
      name: speciesName,
      display: humanize(speciesName),
      sprite: `${apiBase()}/media/sprites/pokemon/${id}.png`,
      hidden: entry.hidden,
    })
  }
  cards.sort((a, b) => a.id - b.id)
  return cards
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

export const getHomeData = createServerFn({ method: 'GET' }).handler(async () => {
  const [species, typeRecords, generations] = await Promise.all([
    getSpeciesIndex(),
    getTypeRecords(),
    getGenerationRecords(),
  ])

  // species id -> type API names in slot order
  const typesBySpeciesId = new Map<number, Array<{ slot: number; type: string }>>()
  for (const record of typeRecords) {
    for (const entry of record.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon?.url ?? '')
      if (id === null || id >= ALT_FORM_ID) continue
      const slots = typesBySpeciesId.get(id) ?? []
      slots.push({ slot: entry.slot ?? 0, type: record.name })
      typesBySpeciesId.set(id, slots)
    }
  }

  // species name -> generation API name
  const generationBySpecies = new Map<string, string>()
  for (const generation of generations) {
    for (const entry of generation.pokemon_species ?? []) {
      generationBySpecies.set(entry.name, generation.name)
    }
  }

  const pokemon = species.map((s) => ({
    id: s.id,
    name: s.name,
    display: humanize(s.name),
    types: (typesBySpeciesId.get(s.id) ?? [])
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type),
    generation: generationBySpecies.get(s.name) ?? null,
    sprite: `${apiBase()}/media/sprites/pokemon/${s.id}.png`,
  }))

  return {
    pokemon,
    types: typeRecords.map((t) => ({ name: t.name, display: englishName(t.names, t.name) })),
    generations: generations.map((g) => ({
      name: g.name,
      display: englishName(g.names, g.name),
    })),
  }
})

// ---------------------------------------------------------------------------
// Pokemon page
// ---------------------------------------------------------------------------

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

interface MoveRow {
  level: number
  name: string // move API name
  display: string // English move name
  typeName: string
  typeDisplay: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

function buildEvolutionNode(node: any): any {
  return {
    name: node.species?.name ?? '',
    display: humanize(node.species?.name ?? ''),
    children: (node.evolves_to ?? []).map(buildEvolutionNode),
  }
}

export const getPokemonData = createServerFn({ method: 'GET' })
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    const species = await apiResource(`/pokemon-species/${encodeURIComponent(name)}`)
    if (!species) return null

    const defaultVariety =
      (species.varieties ?? []).find((v: any) => v.is_default) ?? species.varieties?.[0]
    if (!defaultVariety) return null
    const pokemon = await apiResource(`/pokemon/${defaultVariety.pokemon.name}`)
    if (!pokemon) return null

    const [chain, typeRecords, vgOrders] = await Promise.all([
      species.evolution_chain?.url ? apiUrl(species.evolution_chain.url) : null,
      getTypeRecords(),
      getVersionGroupOrders(),
    ])
    const typeDisplay = new Map(
      typeRecords.map((t) => [t.name, englishName(t.names, t.name)] as const),
    )

    // Fetch every move this pokemon learns (cached across requests).
    const moveNames = [...new Set<string>((pokemon.moves ?? []).map((m: any) => m.move.name))]
    const moveRecords = new Map<string, any>()
    await Promise.all(
      moveNames.map(async (moveName) => {
        const record = await apiResource(`/move/${encodeURIComponent(moveName)}`)
        if (record) moveRecords.set(moveName, record)
      }),
    )

    // Version groups in which this pokemon learns moves, sorted by their order.
    const groupNames = new Set<string>()
    for (const move of pokemon.moves ?? []) {
      for (const detail of move.version_group_details ?? []) {
        groupNames.add(detail.version_group.name)
      }
    }
    const games = [...groupNames]
      .map((groupName) => ({ name: groupName, order: vgOrders.get(groupName) ?? 0 }))
      .sort((a, b) => a.order - b.order)
      .map((g) => ({ name: g.name, display: humanize(g.name) }))

    // For each version group: method -> rows
    const movesByGame: Record<string, Record<string, MoveRow[]>> = {}
    for (const game of games) {
      const byMethod = new Map<string, Map<string, MoveRow>>()
      for (const move of pokemon.moves ?? []) {
        const record = moveRecords.get(move.move.name)
        if (!record) continue
        for (const detail of move.version_group_details ?? []) {
          if (detail.version_group.name !== game.name) continue
          const method = detail.move_learn_method.name
          let movesForMethod = byMethod.get(method)
          if (!movesForMethod) {
            movesForMethod = new Map()
            byMethod.set(method, movesForMethod)
          }
          const existing = movesForMethod.get(move.move.name)
          const level = detail.level_learned_at ?? 0
          if (!existing || level < existing.level) {
            movesForMethod.set(move.move.name, {
              level,
              name: move.move.name,
              display: englishName(record.names, record.name),
              typeName: record.type?.name ?? '',
              typeDisplay: record.type
                ? (typeDisplay.get(record.type.name) ?? humanize(record.type.name))
                : '',
              category: record.damage_class ? humanize(record.damage_class.name) : '',
              power: record.power ?? null,
              accuracy: record.accuracy ?? null,
              pp: record.pp ?? null,
            })
          }
        }
      }
      const methods: Record<string, MoveRow[]> = {}
      const methodNames = [...byMethod.keys()].sort((a, b) => {
        const ai = METHOD_ORDER.indexOf(a)
        const bi = METHOD_ORDER.indexOf(b)
        if (ai !== -1 || bi !== -1) {
          if (ai === -1) return 1
          if (bi === -1) return -1
          return ai - bi
        }
        return humanize(a).localeCompare(humanize(b))
      })
      for (const method of methodNames) {
        const rows = [...byMethod.get(method)!.values()]
        rows.sort((a, b) => {
          if (method === 'level-up' && a.level !== b.level) return a.level - b.level
          return a.display.localeCompare(b.display)
        })
        methods[method] = rows
      }
      movesByGame[game.name] = methods
    }

    const genus = (species.genera ?? []).find((g: any) => g.language?.name === 'en')?.genus ?? null

    const stats = (pokemon.stats ?? []).map((s: any) => ({
      label: STAT_LABELS[s.stat?.name] ?? humanize(s.stat?.name ?? ''),
      value: s.base_stat,
    }))

    return {
      title: englishName(species.names, species.name),
      id: species.id,
      genus,
      types: (pokemon.types ?? [])
        .slice()
        .sort((a: any, b: any) => a.slot - b.slot)
        .map((t: any) => ({
          name: t.type.name,
          display: typeDisplay.get(t.type.name) ?? humanize(t.type.name),
        })),
      artwork:
        pokemon.sprites?.other?.['official-artwork']?.front_default ??
        pokemon.sprites?.front_default ??
        null,
      height: pokemon.height != null ? `${(pokemon.height / 10).toFixed(1)} m` : null,
      weight: pokemon.weight != null ? `${(pokemon.weight / 10).toFixed(1)} kg` : null,
      flavor: latestEnglishFlavor(species.flavor_text_entries),
      stats,
      statsTotal: stats.reduce((sum: number, s: any) => sum + s.value, 0),
      abilities: (pokemon.abilities ?? [])
        .slice()
        .sort((a: any, b: any) => a.slot - b.slot)
        .map((a: any) => ({
          name: a.ability.name,
          display: humanize(a.ability.name),
          hidden: !!a.is_hidden,
        })),
      evolution: chain?.chain ? buildEvolutionNode(chain.chain) : null,
      games,
      movesByGame,
    }
  })

// ---------------------------------------------------------------------------
// Move page
// ---------------------------------------------------------------------------

export const getMoveData = createServerFn({ method: 'GET' })
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    const move = await apiResource(`/move/${encodeURIComponent(name)}`)
    if (!move) return null
    const typeRecords = await getTypeRecords()
    const typeDisplay = new Map(
      typeRecords.map((t) => [t.name, englishName(t.names, t.name)] as const),
    )

    const shortEffect = (move.effect_entries ?? []).find(
      (e: any) => e.language?.name === 'en',
    )?.short_effect
    const effect = shortEffect ?? latestEnglishFlavor(move.flavor_text_entries) ?? null

    const learnedBy = await toCards(
      (move.learned_by_pokemon ?? []).map((p: any) => ({ name: p.name, url: p.url })),
    )

    return {
      title: englishName(move.names, move.name),
      type: move.type
        ? {
            name: move.type.name,
            display: typeDisplay.get(move.type.name) ?? humanize(move.type.name),
          }
        : null,
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power ?? null,
      accuracy: move.accuracy ?? null,
      pp: move.pp ?? null,
      effect,
      learnedBy,
    }
  })

// ---------------------------------------------------------------------------
// Ability page
// ---------------------------------------------------------------------------

export const getAbilityData = createServerFn({ method: 'GET' })
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    const ability = await apiResource(`/ability/${encodeURIComponent(name)}`)
    if (!ability) return null

    const effect = (ability.effect_entries ?? []).find(
      (e: any) => e.language?.name === 'en',
    )?.short_effect

    const pokemon = await toCards(
      (ability.pokemon ?? []).map((entry: any) => ({
        name: entry.pokemon.name,
        url: entry.pokemon.url,
        hidden: !!entry.is_hidden,
      })),
    )

    return {
      title: englishName(ability.names, ability.name),
      effect: effect ?? null,
      pokemon,
    }
  })

// ---------------------------------------------------------------------------
// Type pages
// ---------------------------------------------------------------------------

export const getTypeListData = createServerFn({ method: 'GET' }).handler(async () => {
  const typeRecords = await getTypeRecords()
  return typeRecords.map((t) => ({ name: t.name, display: englishName(t.names, t.name) }))
})

const RELATIONS: Array<[string, string]> = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
]

export const getTypeData = createServerFn({ method: 'GET' })
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    const type = await apiResource(`/type/${encodeURIComponent(name)}`)
    if (!type || EXCLUDED_TYPES.has(type.name)) return null
    const typeRecords = await getTypeRecords()
    const typeDisplay = new Map(
      typeRecords.map((t) => [t.name, englishName(t.names, t.name)] as const),
    )

    const relations = RELATIONS.map(([label, key]) => ({
      label,
      types: (type.damage_relations?.[key] ?? []).map((t: any) => ({
        name: t.name,
        display: typeDisplay.get(t.name) ?? humanize(t.name),
      })),
    }))

    const pokemon = await toCards(
      (type.pokemon ?? []).map((entry: any) => ({
        name: entry.pokemon.name,
        url: entry.pokemon.url,
      })),
    )

    const moves = (type.moves ?? [])
      .map((m: any) => ({ name: m.name, display: humanize(m.name) }))
      .sort((a: any, b: any) => a.display.localeCompare(b.display))

    return {
      title: englishName(type.names, type.name),
      relations,
      pokemon,
      moves,
    }
  })
