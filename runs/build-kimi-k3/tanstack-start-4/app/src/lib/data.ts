// Server-only view-model builders. Everything is derived from live API data.

import { apiGet, spriteUrl } from './api'
import {
  dexNumber,
  englishName,
  englishShortEffect,
  humanize,
  idFromUrl,
  latestEnglishFlavorText,
} from './format'

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])
/** Pokémon ids above this are alternate forms and out of scope. */
const MAX_DEFAULT_POKEMON_ID = 10000

// ---------------------------------------------------------------------------
// Shared cached resources

let typeRecordsPromise: Promise<any[]> | null = null
/** The 18 types, in API order, as full records. */
export function getTypeRecords(): Promise<any[]> {
  if (!typeRecordsPromise) {
    typeRecordsPromise = apiGet('type/?limit=100').then((list) => {
      const refs = list.results.filter((t: any) => !EXCLUDED_TYPES.has(t.name))
      return Promise.all(refs.map((t: any) => apiGet(`type/${t.name}`)))
    })
    typeRecordsPromise.catch(() => (typeRecordsPromise = null))
  }
  return typeRecordsPromise
}

let typeNameMapPromise: Promise<Map<string, string>> | null = null
/** Map of type API name -> English name. */
export function getTypeNameMap(): Promise<Map<string, string>> {
  if (!typeNameMapPromise) {
    typeNameMapPromise = getTypeRecords().then(
      (records) => new Map(records.map((t) => [t.name, englishName(t.names) ?? humanize(t.name)])),
    )
    typeNameMapPromise.catch(() => (typeNameMapPromise = null))
  }
  return typeNameMapPromise
}

let generationRecordsPromise: Promise<any[]> | null = null
export function getGenerationRecords(): Promise<any[]> {
  if (!generationRecordsPromise) {
    generationRecordsPromise = apiGet('generation/?limit=100').then((list) =>
      Promise.all(list.results.map((g: any) => apiGet(`generation/${g.name}`))),
    )
    generationRecordsPromise.catch(() => (generationRecordsPromise = null))
  }
  return generationRecordsPromise
}

let versionGroupRecordsPromise: Promise<any[]> | null = null
export function getVersionGroupRecords(): Promise<any[]> {
  if (!versionGroupRecordsPromise) {
    versionGroupRecordsPromise = apiGet('version-group/?limit=100').then((list) =>
      Promise.all(list.results.map((v: any) => apiGet(`version-group/${v.name}`))),
    )
    versionGroupRecordsPromise.catch(() => (versionGroupRecordsPromise = null))
  }
  return versionGroupRecordsPromise
}

let speciesListPromise: Promise<Array<{ id: number; name: string }>> | null = null
/** Every species (id + API name), in API order. */
export function getSpeciesList(): Promise<Array<{ id: number; name: string }>> {
  if (!speciesListPromise) {
    speciesListPromise = apiGet('pokemon-species/?limit=2000').then((list) =>
      list.results.map((s: any) => ({ id: idFromUrl(s.url), name: s.name })),
    )
    speciesListPromise.catch(() => (speciesListPromise = null))
  }
  return speciesListPromise
}

// ---------------------------------------------------------------------------
// Cards

export interface CardVM {
  id: number
  name: string // species API name
  humanName: string
  dex: string
  sprite: string
  types?: Array<{ name: string; englishName: string }>
  hidden?: boolean
}

/**
 * Map Pokémon references (from move/ability/type data) to species cards.
 * Alternate forms (id > 10000) are excluded; a species' default Pokémon has
 * the same id as the species. Cards are ordered by dex number.
 */
export async function cardsForPokemonRefs(
  refs: Array<{ name: string; url: string }>,
  hiddenById?: Map<number, boolean>,
): Promise<CardVM[]> {
  const species = await getSpeciesList()
  const speciesNameById = new Map(species.map((s) => [s.id, s.name]))
  const seen = new Set<number>()
  const cards: CardVM[] = []
  for (const ref of refs) {
    const id = idFromUrl(ref.url)
    if (!Number.isFinite(id) || id > MAX_DEFAULT_POKEMON_ID) continue
    const name = speciesNameById.get(id)
    if (!name || seen.has(id)) continue
    seen.add(id)
    cards.push({
      id,
      name,
      humanName: humanize(name),
      dex: dexNumber(id),
      sprite: spriteUrl(id),
      hidden: hiddenById?.get(id) ?? undefined,
    })
  }
  cards.sort((a, b) => a.id - b.id)
  return cards
}

// ---------------------------------------------------------------------------
// Home page

export interface CatalogEntry {
  id: number
  name: string
  humanName: string
  dex: string
  sprite: string
  types: Array<{ name: string; englishName: string }>
  generation: string | null
}

export async function buildHomeData() {
  const [species, typeRecords, generationRecords] = await Promise.all([
    getSpeciesList(),
    getTypeRecords(),
    getGenerationRecords(),
  ])

  // default Pokémon id -> types (in slot order)
  const typesByPokemonId = new Map<number, Array<{ slot: number; name: string; englishName: string }>>()
  for (const t of typeRecords) {
    const englishTypeName = englishName(t.names) ?? humanize(t.name)
    for (const p of t.pokemon as Array<{ slot: number; pokemon: { name: string; url: string } }>) {
      const id = idFromUrl(p.pokemon.url)
      if (!Number.isFinite(id) || id > MAX_DEFAULT_POKEMON_ID) continue
      let arr = typesByPokemonId.get(id)
      if (!arr) typesByPokemonId.set(id, (arr = []))
      arr.push({ slot: p.slot, name: t.name, englishName: englishTypeName })
    }
  }

  // species API name -> generation API name
  const generationBySpecies = new Map<string, string>()
  for (const g of generationRecords) {
    for (const s of g.pokemon_species as Array<{ name: string }>) {
      generationBySpecies.set(s.name, g.name)
    }
  }

  const catalog: CatalogEntry[] = species.map((s) => {
    const types = (typesByPokemonId.get(s.id) ?? [])
      .sort((a, b) => a.slot - b.slot)
      .map(({ name, englishName }) => ({ name, englishName }))
    return {
      id: s.id,
      name: s.name,
      humanName: humanize(s.name),
      dex: dexNumber(s.id),
      sprite: spriteUrl(s.id),
      types,
      generation: generationBySpecies.get(s.name) ?? null,
    }
  })

  return {
    catalog,
    types: typeRecords.map((t) => ({
      name: t.name,
      englishName: englishName(t.names) ?? humanize(t.name),
    })),
    generations: generationRecords.map((g) => ({
      name: g.name,
      englishName: englishName(g.names) ?? humanize(g.name),
    })),
  }
}

// ---------------------------------------------------------------------------
// Pokémon page

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

export interface MoveRowVM {
  level: number
  move: string // English name
  moveName: string // API name
  type: string | null // type API name
  typeName: string // English type name (or —)
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

export interface MoveTableVM {
  method: string
  label: string
  hasLevel: boolean
  rows: MoveRowVM[]
}

interface EvoNodeVM {
  name: string
  humanName: string
  evolvesTo: EvoNodeVM[]
}

function evoNodeVm(link: any): EvoNodeVM {
  return {
    name: link.species.name,
    humanName: humanize(link.species.name),
    evolvesTo: (link.evolves_to ?? []).map(evoNodeVm),
  }
}

export async function buildPokemonPageData(name: string, game?: string) {
  const species = await apiGet(`pokemon-species/${name}`)
  const variety =
    species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0]
  const pokemon = await apiGet(`pokemon/${variety.pokemon.name}`)
  const chainId = idFromUrl(species.evolution_chain.url)
  const [chain, versionGroups, typeNameMap] = await Promise.all([
    apiGet(`evolution-chain/${chainId}`),
    getVersionGroupRecords(),
    getTypeNameMap(),
  ])

  const title = englishName(species.names) ?? humanize(species.name)
  const genus =
    species.genera?.find((g: any) => g.language?.name === 'en')?.genus ?? null

  // Version groups in which this Pokémon learns moves, ordered by `order`.
  const vgOrder = new Map<string, number>(
    versionGroups.map((v: any) => [v.name, v.order ?? 0]),
  )
  const gameSet = new Set<string>()
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) {
      gameSet.add(d.version_group.name)
    }
  }
  const games = [...gameSet].sort(
    (a, b) => (vgOrder.get(a) ?? 0) - (vgOrder.get(b) ?? 0),
  )
  const selectedGame =
    game && games.includes(game) ? game : games[games.length - 1] ?? null

  // Moves for the selected version group, grouped by learn method.
  const entries: Array<{ move: string; method: string; level: number }> = []
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) {
      if (d.version_group.name !== selectedGame) continue
      entries.push({
        move: m.move.name,
        method: d.move_learn_method.name,
        level: d.level_learned_at ?? 0,
      })
    }
  }
  const moveNames = [...new Set(entries.map((e) => e.move))]
  const moveRecords = await Promise.all(moveNames.map((n) => apiGet(`move/${n}`)))
  const moveInfo = new Map<string, any>(moveRecords.map((m: any) => [m.name, m]))

  const byMethod = new Map<string, MoveRowVM[]>()
  for (const e of entries) {
    const info = moveInfo.get(e.move)
    const row: MoveRowVM = {
      level: e.level,
      move: englishName(info?.names) ?? humanize(e.move),
      moveName: e.move,
      type: info?.type?.name ?? null,
      typeName: info?.type?.name
        ? (typeNameMap.get(info.type.name) ?? humanize(info.type.name))
        : '—',
      category: info?.damage_class?.name ? humanize(info.damage_class.name) : '—',
      power: info?.power ?? null,
      accuracy: info?.accuracy ?? null,
      pp: info?.pp ?? null,
    }
    let rows = byMethod.get(e.method)
    if (!rows) byMethod.set(e.method, (rows = []))
    rows.push(row)
  }

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a)
    const ib = METHOD_ORDER.indexOf(b)
    return (
      (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib) ||
      humanize(a).localeCompare(humanize(b))
    )
  })

  const tables: MoveTableVM[] = methods.map((method) => {
    const rows = byMethod.get(method)!
    rows.sort((a, b) =>
      method === 'level-up'
        ? a.level - b.level || a.move.localeCompare(b.move)
        : a.move.localeCompare(b.move),
    )
    return {
      method,
      label: humanize(method),
      hasLevel: method === 'level-up',
      rows,
    }
  })

  const stats = (pokemon.stats ?? []).map((s: any) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }))

  const types = [...(pokemon.types ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((t: any) => ({
      name: t.type.name,
      englishName: typeNameMap.get(t.type.name) ?? humanize(t.type.name),
    }))

  const abilities = [...(pokemon.abilities ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((a: any) => ({
      name: a.ability.name,
      humanName: humanize(a.ability.name),
      isHidden: Boolean(a.is_hidden),
    }))

  return {
    title,
    id: species.id,
    dex: dexNumber(species.id),
    genus,
    types,
    artwork:
      pokemon.sprites?.other?.['official-artwork']?.front_default ??
      pokemon.sprites?.front_default ??
      null,
    height: typeof pokemon.height === 'number' ? pokemon.height : null,
    weight: typeof pokemon.weight === 'number' ? pokemon.weight : null,
    flavor: latestEnglishFlavorText(species.flavor_text_entries),
    stats,
    statsTotal: stats.reduce((sum: number, s: any) => sum + s.value, 0),
    abilities,
    evolution: evoNodeVm(chain.chain),
    games: games.map((g) => ({ name: g, label: humanize(g) })),
    selectedGame,
    tables,
  }
}

// ---------------------------------------------------------------------------
// Move page

export async function buildMovePageData(name: string) {
  const move = await apiGet(`move/${name}`)
  const typeNameMap = await getTypeNameMap()
  const learnedBy = await cardsForPokemonRefs(move.learned_by_pokemon ?? [])
  return {
    title: englishName(move.names) ?? humanize(move.name),
    type: move.type?.name
      ? { name: move.type.name, englishName: typeNameMap.get(move.type.name) ?? humanize(move.type.name) }
      : null,
    category: move.damage_class?.name ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect:
      englishShortEffect(move.effect_entries) ??
      latestEnglishFlavorText(move.flavor_text_entries),
    learnedBy,
  }
}

// ---------------------------------------------------------------------------
// Ability page

export async function buildAbilityPageData(name: string) {
  const ability = await apiGet(`ability/${name}`)
  const entries = (ability.pokemon ?? []) as Array<{
    is_hidden: boolean
    pokemon: { name: string; url: string }
  }>
  const hiddenById = new Map<number, boolean>()
  for (const e of entries) hiddenById.set(idFromUrl(e.pokemon.url), Boolean(e.is_hidden))
  const pokemon = await cardsForPokemonRefs(
    entries.map((e) => e.pokemon),
    hiddenById,
  )
  return {
    title: englishName(ability.names) ?? humanize(ability.name),
    effect: englishShortEffect(ability.effect_entries),
    pokemon,
  }
}

// ---------------------------------------------------------------------------
// Type pages

export async function buildTypeListData() {
  const typeRecords = await getTypeRecords()
  return {
    types: typeRecords.map((t) => ({
      name: t.name,
      englishName: englishName(t.names) ?? humanize(t.name),
    })),
  }
}

const RELATION_GROUPS: Array<{ key: string; label: string }> = [
  { key: 'double_damage_to', label: 'Super effective against' },
  { key: 'half_damage_to', label: 'Not very effective against' },
  { key: 'no_damage_to', label: 'No effect against' },
  { key: 'double_damage_from', label: 'Weak to' },
  { key: 'half_damage_from', label: 'Resists' },
  { key: 'no_damage_from', label: 'Immune to' },
]

export async function buildTypePageData(name: string) {
  const type = await apiGet(`type/${name}`)
  const typeNameMap = await getTypeNameMap()
  const refs = (type.pokemon ?? []).map((p: any) => p.pokemon)
  const pokemon = await cardsForPokemonRefs(refs)
  const moves = (type.moves ?? [])
    .map((m: any) => ({ name: m.name, humanName: humanize(m.name) }))
    .sort((a: any, b: any) => a.humanName.localeCompare(b.humanName))
  return {
    title: englishName(type.names) ?? humanize(type.name),
    relations: RELATION_GROUPS.map(({ key, label }) => ({
      label,
      types: (type.damage_relations?.[key] ?? []).map((t: any) => ({
        name: t.name,
        englishName: typeNameMap.get(t.name) ?? humanize(t.name),
      })),
    })),
    pokemon,
    moves,
  }
}
