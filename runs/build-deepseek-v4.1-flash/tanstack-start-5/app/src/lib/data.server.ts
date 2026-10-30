import {
  dexNumber,
  englishName,
  englishShortEffect,
  humanize,
  idFromUrl,
  latestEnglishFlavorText,
} from './format'

const API_ORIGIN = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '')
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])
const PAGE_SIZE = 48

type NamedRef = { name: string; url: string }
type ListResponse<T> = { count: number; results: T[] }
type Language = { name: string }
type NameEntry = { name: string; language: Language }
type FlavorEntry = { flavor_text: string; language: Language }
type EffectEntry = { short_effect: string; language: Language }

type SpeciesRecord = {
  id: number
  name: string
  names: NameEntry[]
  genera: Array<{ genus: string; language: Language }>
  generation: NamedRef
  evolution_chain: NamedRef | null
  varieties: Array<{ is_default: boolean; pokemon: NamedRef }>
  flavor_text_entries: FlavorEntry[]
}

type PokemonRecord = {
  id: number
  name: string
  species: NamedRef
  height: number
  weight: number
  types: Array<{ slot: number; type: NamedRef }>
  stats: Array<{ base_stat: number; stat: NamedRef }>
  abilities: Array<{ is_hidden: boolean; slot: number; ability: NamedRef }>
  sprites: {
    front_default: string | null
    other?: {
      'official-artwork'?: { front_default: string | null }
      home?: { front_default: string | null }
    }
  }
  moves: Array<{
    move: NamedRef
    version_group_details: Array<{
      level_learned_at: number
      version_group: NamedRef
      move_learn_method: NamedRef
    }>
  }>
}

type MoveRecord = {
  id: number
  name: string
  names: NameEntry[]
  type: NamedRef
  damage_class: NamedRef
  power: number | null
  accuracy: number | null
  pp: number | null
  effect_entries: EffectEntry[]
  flavor_text_entries: FlavorEntry[]
  learned_by_pokemon: NamedRef[]
}

type AbilityRecord = {
  id: number
  name: string
  names: NameEntry[]
  effect_entries: EffectEntry[]
  pokemon: Array<{ is_hidden: boolean; slot: number; pokemon: NamedRef }>
}

type TypeRecord = {
  id: number
  name: string
  names: NameEntry[]
  damage_relations: Record<string, NamedRef[]>
  pokemon: Array<{ slot: number; pokemon: NamedRef }>
  moves: NamedRef[]
}

type GenerationRecord = {
  id: number
  name: string
  names: NameEntry[]
  pokemon_species: NamedRef[]
}

type VersionGroupRecord = {
  id: number
  name: string
  order: number
}

const cache = new Map<string, Promise<unknown>>()

function apiGet<T>(path: string): Promise<T> {
  const cleanPath = path.replace(/^\/+/, '')
  const url = `${API_ORIGIN}/api/v2/${cleanPath}`
  const existing = cache.get(url)
  if (existing) return existing as Promise<T>

  const promise = fetch(url, { headers: { accept: 'application/json' } }).then(async (response) => {
    if (!response.ok) {
      const error = new Error(`API request failed (${response.status}): ${url}`)
      ;(error as Error & { status?: number }).status = response.status
      throw error
    }
    return response.json()
  })
  promise.catch(() => cache.delete(url))
  cache.set(url, promise)
  return promise
}

function isNotFound(error: unknown): boolean {
  return (error as { status?: number } | null)?.status === 404
}

function mediaSprite(pokemonId: number): string {
  return `${API_ORIGIN}/media/sprites/pokemon/${pokemonId}.png`
}

async function getSpeciesList(): Promise<Array<{ id: number; name: string }>> {
  const list = await apiGet<ListResponse<NamedRef>>('pokemon-species/?limit=100000')
  return list.results
    .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name }))
    .filter((entry): entry is { id: number; name: string } => entry.id !== null)
}

async function getSpeciesByName(name: string): Promise<SpeciesRecord> {
  return apiGet<SpeciesRecord>(`pokemon-species/${encodeURIComponent(name)}`)
}

async function getPokemon(nameOrId: string | number): Promise<PokemonRecord> {
  return apiGet<PokemonRecord>(`pokemon/${encodeURIComponent(String(nameOrId))}`)
}

async function getMove(name: string): Promise<MoveRecord> {
  return apiGet<MoveRecord>(`move/${encodeURIComponent(name)}`)
}

async function getAbility(name: string): Promise<AbilityRecord> {
  return apiGet<AbilityRecord>(`ability/${encodeURIComponent(name)}`)
}

async function getType(name: string): Promise<TypeRecord> {
  return apiGet<TypeRecord>(`type/${encodeURIComponent(name)}`)
}

async function getGeneration(name: string): Promise<GenerationRecord> {
  return apiGet<GenerationRecord>(`generation/${encodeURIComponent(name)}`)
}

async function getVersionGroup(name: string): Promise<VersionGroupRecord> {
  return apiGet<VersionGroupRecord>(`version-group/${encodeURIComponent(name)}`)
}

let allTypesPromise: Promise<TypeRecord[]> | null = null
async function getAllTypeRecords(): Promise<TypeRecord[]> {
  if (!allTypesPromise) {
    allTypesPromise = (async () => {
      const list = await apiGet<ListResponse<NamedRef>>('type/?limit=1000')
      const wanted = list.results.filter((entry) => !EXCLUDED_TYPES.has(entry.name))
      return Promise.all(wanted.map((entry) => getType(entry.name)))
    })().catch((error) => {
      allTypesPromise = null
      throw error
    })
  }
  return allTypesPromise
}

let allGenerationsPromise: Promise<GenerationRecord[]> | null = null
async function getAllGenerationRecords(): Promise<GenerationRecord[]> {
  if (!allGenerationsPromise) {
    allGenerationsPromise = (async () => {
      const list = await apiGet<ListResponse<NamedRef>>('generation/?limit=1000')
      return Promise.all(list.results.map((entry) => getGeneration(entry.name)))
    })().catch((error) => {
      allGenerationsPromise = null
      throw error
    })
  }
  return allGenerationsPromise
}

async function getTypeLabelMap(): Promise<Map<string, string>> {
  const types = await getAllTypeRecords()
  return new Map(types.map((type) => [type.name, englishName(type.names, type.name)]))
}

async function typeLabel(name: string, labels: Map<string, string>): Promise<string> {
  const known = labels.get(name)
  if (known) return known
  try {
    const record = await getType(name)
    const label = englishName(record.names, name)
    labels.set(name, label)
    return label
  } catch {
    return humanize(name)
  }
}

async function speciesIndex(): Promise<Map<number, { id: number; name: string }>> {
  const species = await getSpeciesList()
  return new Map(species.map((entry) => [entry.id, entry]))
}

function speciesCard(
  species: { id: number; name: string },
  sprite: string | null = mediaSprite(species.id),
): CardData {
  return {
    id: species.id,
    speciesName: species.name,
    displayName: humanize(species.name),
    dex: dexNumber(species.id),
    sprite,
    types: [],
    hiddenAbility: false,
  }
}

export type CardType = { name: string; label: string }

export type CardData = {
  id: number
  speciesName: string
  displayName: string
  dex: string
  sprite: string | null
  types: CardType[]
  hiddenAbility: boolean
}

export type HomeFilters = {
  q: string
  type: string
  generation: string
  page: number
}

export type HomeData = {
  count: number
  page: number
  totalPages: number
  items: CardData[]
  types: Array<{ name: string; label: string }>
  generations: Array<{ name: string; label: string }>
}

export async function getHomeData(filters: HomeFilters): Promise<HomeData> {
  const [species, typeRecords, generationRecords] = await Promise.all([
    getSpeciesList(),
    getAllTypeRecords(),
    getAllGenerationRecords(),
  ])
  const labelMap = new Map(typeRecords.map((type) => [type.name, englishName(type.names, type.name)]))
  const typeOptions = typeRecords.map((type) => ({
    name: type.name,
    label: labelMap.get(type.name) ?? humanize(type.name),
  }))
  const generationOptions = generationRecords.map((generation) => ({
    name: generation.name,
    label: englishName(generation.names, generation.name),
  }))

  let matching = [...species].sort((a, b) => a.id - b.id)
  const search = filters.q.trim().toLowerCase()
  if (search) {
    matching = matching.filter((entry) => humanize(entry.name).toLowerCase().includes(search))
  }

  if (filters.type && typeOptions.some((type) => type.name === filters.type)) {
    const type = await getType(filters.type)
    const allowed = new Set<number>()
    for (const entry of type.pokemon) {
      const id = idFromUrl(entry.pokemon.url)
      if (id !== null && id <= 10000) allowed.add(id)
    }
    matching = matching.filter((entry) => allowed.has(entry.id))
  }

  if (
    filters.generation &&
    generationOptions.some((generation) => generation.name === filters.generation)
  ) {
    const generation = await getGeneration(filters.generation)
    const allowed = new Set<number>()
    for (const entry of generation.pokemon_species) {
      const id = idFromUrl(entry.url)
      if (id !== null) allowed.add(id)
    }
    matching = matching.filter((entry) => allowed.has(entry.id))
  }

  const count = matching.length
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const page = Math.min(Math.max(1, Math.trunc(filters.page || 1)), totalPages)
  const pageSpecies = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const items = await Promise.all(
    pageSpecies.map(async (entry): Promise<CardData> => {
      try {
        const pokemon = await getPokemon(entry.id)
        const types = [...pokemon.types]
          .sort((a, b) => a.slot - b.slot)
          .map((slot) => ({
            name: slot.type.name,
            label: labelMap.get(slot.type.name) ?? humanize(slot.type.name),
          }))
        return {
          ...speciesCard(entry, pokemon.sprites.front_default ?? mediaSprite(entry.id)),
          types,
        }
      } catch {
        return speciesCard(entry)
      }
    }),
  )

  return { count, page, totalPages, items, types: typeOptions, generations: generationOptions }
}

export type StatsRow = { label: string; value: number }

export type MoveRow = {
  id: string
  level: number | null
  moveName: string
  moveLabel: string
  typeName: string
  typeLabel: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

export type MoveTableData = {
  method: string
  label: string
  hasLevel: boolean
  rows: MoveRow[]
}

export type EvolutionNode = {
  speciesName: string
  label: string
  evolvesTo: EvolutionNode[]
}

export type PokemonPageData =
  | { notFound: true }
  | {
      notFound: false
      id: number
      dex: string
      name: string
      genus: string
      types: Array<{ name: string; label: string }>
      artwork: string | null
      height: string
      weight: string
      flavor: string
      stats: StatsRow[]
      statTotal: number
      abilities: Array<{ name: string; label: string; hidden: boolean }>
      evolution: EvolutionNode
      games: Array<{ name: string; label: string; selected: boolean }>
      selectedGame: string
      tables: MoveTableData[]
    }

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

function buildEvolutionNode(chain: {
  species: NamedRef
  evolves_to: Array<unknown>
}): EvolutionNode {
  return {
    speciesName: chain.species.name,
    label: humanize(chain.species.name),
    evolvesTo: (chain.evolves_to as Array<{ species: NamedRef; evolves_to: Array<unknown> }>).map(
      (child) => buildEvolutionNode(child),
    ),
  }
}

function methodSortKey(method: string): [number, string] {
  const index = ['level-up', 'machine', 'egg', 'tutor'].indexOf(method)
  return index === -1 ? [4, humanize(method)] : [index, humanize(method)]
}

export async function getPokemonPageData(
  speciesName: string,
  requestedGame: string,
): Promise<PokemonPageData> {
  let species: SpeciesRecord
  try {
    species = await getSpeciesByName(speciesName)
  } catch (error) {
    if (isNotFound(error)) return { notFound: true }
    throw error
  }

  const defaultVariety =
    species.varieties.find((variety) => variety.is_default)?.pokemon ??
    species.varieties[0]?.pokemon
  let pokemon: PokemonRecord
  try {
    pokemon = await getPokemon(defaultVariety?.name ?? species.id)
  } catch (error) {
    if (!isNotFound(error)) throw error
    pokemon = await getPokemon(species.id)
  }

  const labelMap = await getTypeLabelMap()
  const english = englishName(species.names, species.name)
  const genus =
    species.genera.find((entry) => entry.language.name === 'en')?.genus ?? '—'
  const flavor = latestEnglishFlavorText(species.flavor_text_entries)

  const stats = pokemon.stats.map((entry) => ({
    label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
    value: entry.base_stat,
  }))
  const statTotal = stats.reduce((sum, stat) => sum + stat.value, 0)

  const types = [...pokemon.types]
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => ({
      name: entry.type.name,
      label: labelMap.get(entry.type.name) ?? humanize(entry.type.name),
    }))

  const abilities = [...pokemon.abilities]
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => ({
      name: entry.ability.name,
      label: humanize(entry.ability.name),
      hidden: entry.is_hidden,
    }))

  let evolution: EvolutionNode = {
    speciesName: species.name,
    label: humanize(species.name),
    evolvesTo: [],
  }
  if (species.evolution_chain?.url) {
    try {
      const chain = await apiGet<{ chain: { species: NamedRef; evolves_to: Array<unknown> } }>(
        `evolution-chain/${idFromUrl(species.evolution_chain.url) ?? ''}`,
      )
      evolution = buildEvolutionNode(chain.chain)
    } catch {
      // Keep the single-species fallback.
    }
  }

  // Work out which version groups this Pokémon can learn moves in.
  const gameNames = new Set<string>()
  for (const move of pokemon.moves) {
    for (const detail of move.version_group_details) {
      gameNames.add(detail.version_group.name)
    }
  }
  const gamesWithOrder = await Promise.all(
    [...gameNames].map(async (name) => {
      try {
        const group = await getVersionGroup(name)
        return { name, label: humanize(name), order: group.order }
      } catch {
        return { name, label: humanize(name), order: 0 }
      }
    }),
  )
  gamesWithOrder.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))

  const selectedGame =
    requestedGame && gamesWithOrder.some((game) => game.name === requestedGame)
      ? requestedGame
      : (gamesWithOrder[gamesWithOrder.length - 1]?.name ?? '')
  const games = gamesWithOrder.map((game) => ({
    name: game.name,
    label: game.label,
    selected: game.name === selectedGame,
  }))

  // Collect the moves for the selected game, grouped by learn method.
  const selectedDetails: Array<{
    move: NamedRef
    method: string
    level: number
  }> = []
  if (selectedGame) {
    for (const entry of pokemon.moves) {
      for (const detail of entry.version_group_details) {
        if (detail.version_group.name !== selectedGame) continue
        selectedDetails.push({
          move: entry.move,
          method: detail.move_learn_method.name,
          level: detail.level_learned_at,
        })
      }
    }
  }

  const moveDetails = new Map<string, MoveRecord>()
  const uniqueMoveNames = [...new Set(selectedDetails.map((detail) => detail.move.name))]
  await Promise.all(
    uniqueMoveNames.map(async (name) => {
      try {
        moveDetails.set(name, await getMove(name))
      } catch {
        // Ignore a missing move; it will be omitted from the tables.
      }
    }),
  )

  const byMethod = new Map<string, MoveRow[]>()
  for (const detail of selectedDetails) {
    const move = moveDetails.get(detail.move.name)
    if (!move) continue
    const row: MoveRow = {
      id: `${detail.method}:${detail.move.name}:${detail.level}`,
      level: detail.method === 'level-up' ? detail.level : null,
      moveName: move.name,
      moveLabel: englishName(move.names, move.name),
      typeName: move.type.name,
      typeLabel:
        labelMap.get(move.type.name) ?? (await typeLabel(move.type.name, labelMap)),
      category: humanize(move.damage_class.name),
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    }
    const rows = byMethod.get(detail.method) ?? []
    rows.push(row)
    byMethod.set(detail.method, rows)
  }

  const tables: MoveTableData[] = [...byMethod.entries()]
    .sort(([a], [b]) => {
      const [aGroup, aLabel] = methodSortKey(a)
      const [bGroup, bLabel] = methodSortKey(b)
      return aGroup - bGroup || aLabel.localeCompare(bLabel)
    })
    .map(([method, rows]) => {
      const sorted = [...rows].sort((a, b) => {
        if (method === 'level-up') {
          const levelDiff = (a.level ?? Infinity) - (b.level ?? Infinity)
          if (levelDiff !== 0) return levelDiff
        }
        return a.moveLabel.localeCompare(b.moveLabel)
      })
      return { method, label: humanize(method), hasLevel: method === 'level-up', rows: sorted }
    })

  return {
    notFound: false,
    id: species.id,
    dex: dexNumber(species.id),
    name: english,
    genus,
    types,
    artwork:
      pokemon.sprites.other?.['official-artwork']?.front_default ??
      pokemon.sprites.other?.home?.front_default ??
      pokemon.sprites.front_default ??
      null,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavor,
    stats,
    statTotal,
    abilities,
    evolution,
    games,
    selectedGame,
    tables,
  }
}

export type MovePageData =
  | { notFound: true }
  | {
      notFound: false
      name: string
      typeName: string
      typeLabel: string
      category: string
      power: string
      accuracy: string
      pp: string
      effect: string
      learnedBy: CardData[]
    }

export async function getMovePageData(moveName: string): Promise<MovePageData> {
  let move: MoveRecord
  try {
    move = await getMove(moveName)
  } catch (error) {
    if (isNotFound(error)) return { notFound: true }
    throw error
  }

  const [labelMap, index] = await Promise.all([getTypeLabelMap(), speciesIndex()])
  const cards: CardData[] = []
  const seen = new Set<number>()
  for (const entry of move.learned_by_pokemon) {
    const id = idFromUrl(entry.url)
    if (id === null || id > 10000 || seen.has(id)) continue
    const species = index.get(id)
    if (!species) continue
    seen.add(id)
    cards.push(speciesCard(species))
  }
  cards.sort((a, b) => a.id - b.id)

  const flavor = latestEnglishFlavorText(move.flavor_text_entries)
  const effect = englishShortEffect(move.effect_entries) || flavor || '—'

  return {
    notFound: false,
    name: englishName(move.names, move.name),
    typeName: move.type.name,
    typeLabel: labelMap.get(move.type.name) ?? (await typeLabel(move.type.name, labelMap)),
    category: humanize(move.damage_class.name),
    power: move.power === null ? '—' : String(move.power),
    accuracy: move.accuracy === null ? '—' : String(move.accuracy),
    pp: move.pp === null ? '—' : String(move.pp),
    effect,
    learnedBy: cards,
  }
}

export type AbilityPageData =
  | { notFound: true }
  | {
      notFound: false
      name: string
      effect: string
      pokemon: CardData[]
    }

export async function getAbilityPageData(abilityName: string): Promise<AbilityPageData> {
  let ability: AbilityRecord
  try {
    ability = await getAbility(abilityName)
  } catch (error) {
    if (isNotFound(error)) return { notFound: true }
    throw error
  }

  const index = await speciesIndex()
  const hidden = new Set<number>()
  const seen = new Set<number>()
  for (const entry of ability.pokemon) {
    const id = idFromUrl(entry.pokemon.url)
    if (id === null || id > 10000 || !index.has(id)) continue
    seen.add(id)
    if (entry.is_hidden) hidden.add(id)
  }
  const cards = [...seen].map((id) => speciesCard(index.get(id)!))
  cards.sort((a, b) => a.id - b.id)
  for (const card of cards) card.hiddenAbility = hidden.has(card.id)

  return {
    notFound: false,
    name: englishName(ability.names, ability.name),
    effect: englishShortEffect(ability.effect_entries) || '—',
    pokemon: cards,
  }
}

export type TypeListData = {
  types: Array<{ name: string; label: string }>
}

export async function getTypeListData(): Promise<TypeListData> {
  const types = await getAllTypeRecords()
  return {
    types: types.map((type) => ({
      name: type.name,
      label: englishName(type.names, type.name),
    })),
  }
}

export type TypePageData =
  | { notFound: true }
  | {
      notFound: false
      name: string
      relations: Array<{
        label: string
        types: Array<{ name: string; label: string }>
      }>
      pokemon: CardData[]
      moves: Array<{ name: string; label: string }>
    }

const RELATION_TERMS: Array<{ label: string; key: string }> = [
  { label: 'Super effective against', key: 'double_damage_to' },
  { label: 'Not very effective against', key: 'half_damage_to' },
  { label: 'No effect against', key: 'no_damage_to' },
  { label: 'Weak to', key: 'double_damage_from' },
  { label: 'Resists', key: 'half_damage_from' },
  { label: 'Immune to', key: 'no_damage_from' },
]

export async function getTypePageData(typeName: string): Promise<TypePageData> {
  const allTypes = await getAllTypeRecords()
  if (!allTypes.some((type) => type.name === typeName)) return { notFound: true }

  let type: TypeRecord
  try {
    type = await getType(typeName)
  } catch (error) {
    if (isNotFound(error)) return { notFound: true }
    throw error
  }

  const labelMap = new Map(allTypes.map((entry) => [entry.name, englishName(entry.names, entry.name)]))
  const index = await speciesIndex()

  const seen = new Set<number>()
  const cards: CardData[] = []
  for (const entry of type.pokemon) {
    const id = idFromUrl(entry.pokemon.url)
    if (id === null || id > 10000 || seen.has(id)) continue
    const species = index.get(id)
    if (!species) continue
    seen.add(id)
    cards.push(speciesCard(species))
  }
  cards.sort((a, b) => a.id - b.id)

  const relations = RELATION_TERMS.map((term) => ({
    label: term.label,
    types: (type.damage_relations[term.key] ?? []).map((related) => ({
      name: related.name,
      label: labelMap.get(related.name) ?? humanize(related.name),
    })),
  }))

  const moves = type.moves
    .map((move) => ({ name: move.name, label: humanize(move.name) }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return {
    notFound: false,
    name: englishName(type.names, type.name),
    relations,
    pokemon: cards,
    moves,
  }
}
