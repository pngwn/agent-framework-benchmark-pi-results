import {
  collapseWhitespace,
  englishEntry,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from './format'
import type {
  AbilityPageData,
  CardType,
  DamageRelation,
  EvolutionNode,
  FilterOption,
  HomeData,
  MovePageData,
  MoveTableData,
  PokemonCardData,
  PokemonPageData,
  TypePageData,
  TypeListData,
} from './model'

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/$/, '')

type Json = any

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])
const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const memory = new Map<string, { value: unknown; expires: number }>()
const inFlight = new Map<string, Promise<unknown>>()

function memo<T>(key: string, load: () => Promise<T>, ttl = 10 * 60_000): Promise<T> {
  const hit = memory.get(key)
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value as T)
  const pending = inFlight.get(key)
  if (pending) return pending as Promise<T>

  const promise = load()
    .then((value) => {
      memory.set(key, { value, expires: Date.now() + ttl })
      return value
    })
    .finally(() => {
      inFlight.delete(key)
    })
  inFlight.set(key, promise)
  return promise
}

async function apiGet<T = Json>(path: string): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}/api/v2/${path}`, {
    headers: { Accept: 'application/json' },
  })
  if (response.status === 404) {
    await response.body?.cancel()
    return null
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`API ${response.status} for ${path}: ${text.slice(0, 200)}`)
  }
  return (await response.json()) as T
}

function mediaUrl(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) return `${API_BASE_URL}${value}`
  return `${API_BASE_URL}/${value.replace(/^\//, '')}`
}

function spriteForId(id: number): string {
  return `${API_BASE_URL}/media/sprites/pokemon/${id}.png`
}

interface SpeciesRef {
  id: number
  name: string
}

interface TypeInfo {
  id: number
  name: string
  label: string
  record: Json
}

interface GenerationInfo {
  id: number
  name: string
  label: string
  record: Json
}

const getSpeciesList = () =>
  memo<SpeciesRef[]>('species-list', async () => {
    const data = await apiGet<Json>('pokemon-species/?limit=100000')
    return (data?.results ?? [])
      .map((entry: Json) => ({ id: idFromUrl(entry.url), name: String(entry.name) }))
      .filter((entry: SpeciesRef) => entry.id > 0)
      .sort((a: SpeciesRef, b: SpeciesRef) => a.id - b.id)
  })

const getSpeciesById = async () => {
  const list = await getSpeciesList()
  return new Map(list.map((entry) => [entry.id, entry]))
}

const getAllTypes = () =>
  memo<TypeInfo[]>('type-list', async () => {
    const data = await apiGet<Json>('type/?limit=100000')
    const refs: Json[] = data?.results ?? []
    const records = await Promise.all(
      refs.map((entry) => apiGet<Json>(`type/${encodeURIComponent(entry.name)}/`)),
    )
    return refs
      .map((entry, index) => {
        const record = records[index]
        if (!record || EXCLUDED_TYPES.has(record.name)) return null
        return {
          id: Number(record.id ?? idFromUrl(entry.url)),
          name: String(record.name ?? entry.name),
          label: englishEntry(record.names, 'name') ?? humanize(record.name ?? entry.name),
          record,
        }
      })
      .filter((entry): entry is TypeInfo => Boolean(entry))
      .sort((a, b) => a.id - b.id)
  })

const getTypeMap = async () => {
  const types = await getAllTypes()
  return new Map(types.map((entry) => [entry.name, entry]))
}

const getGenerations = () =>
  memo<GenerationInfo[]>('generation-list', async () => {
    const data = await apiGet<Json>('generation/?limit=100000')
    const refs: Json[] = data?.results ?? []
    const records = await Promise.all(
      refs.map((entry) => apiGet<Json>(`generation/${encodeURIComponent(entry.name)}/`)),
    )
    return refs
      .map((entry, index) => {
        const record = records[index]
        if (!record) return null
        return {
          id: Number(record.id ?? idFromUrl(entry.url)),
          name: String(record.name ?? entry.name),
          label: englishEntry(record.names, 'name') ?? humanize(record.name ?? entry.name),
          record,
        }
      })
      .filter((entry): entry is GenerationInfo => Boolean(entry))
      .sort((a, b) => a.id - b.id)
  })

const getTypeSlots = () =>
  memo<Map<number, CardType[]>>('type-slots', async () => {
    const types = await getAllTypes()
    const slots = new Map<number, CardType[]>()
    for (const type of types) {
      for (const entry of type.record.pokemon ?? []) {
        const id = idFromUrl(entry?.pokemon?.url)
        if (!id || id > 10000) continue
        const list = slots.get(id) ?? []
        if (!list.some((item) => item.name === type.name)) {
          list.push({ name: type.name, label: type.label, slot: Number(entry.slot ?? 0) })
        }
        slots.set(id, list)
      }
    }
    for (const list of slots.values()) {
      list.sort((a, b) => a.slot - b.slot || a.label.localeCompare(b.label))
    }
    return slots
  })

const getEvolutionChain = (id: number) =>
  memo<Json>(`evolution-chain-${id}`, () => apiGet<Json>(`evolution-chain/${id}/`))

const getVersionGroup = (name: string) =>
  memo<Json>(`version-group-${name}`, () =>
    apiGet<Json>(`version-group/${encodeURIComponent(name)}/`),
  )

const getMove = (name: string) =>
  memo<Json>(`move-${name}`, () => apiGet<Json>(`move/${encodeURIComponent(name)}/`))

const getAbility = (name: string) =>
  memo<Json>(`ability-${name}`, () => apiGet<Json>(`ability/${encodeURIComponent(name)}/`))

const getSpecies = (name: string) =>
  memo<Json>(`species-${name}`, () =>
    apiGet<Json>(`pokemon-species/${encodeURIComponent(name)}/`),
  )

const getPokemon = (idOrName: number | string) =>
  memo<Json>(`pokemon-${idOrName}`, () =>
    apiGet<Json>(`pokemon/${encodeURIComponent(String(idOrName))}/`),
  )

const getType = (name: string) =>
  memo<Json>(`type-${name}`, () => apiGet<Json>(`type/${encodeURIComponent(name)}/`))

function cardFromSpecies(species: SpeciesRef, spriteId: number, types: CardType[] = []): PokemonCardData {
  return {
    id: species.id,
    name: species.name,
    label: humanize(species.name),
    sprite: spriteForId(spriteId),
    types,
  }
}

function cardsFromPokemonRefs(
  refs: Json[],
  speciesById: Map<number, SpeciesRef>,
  typeSlots?: Map<number, CardType[]>,
): PokemonCardData[] {
  const byId = new Map<number, PokemonCardData>()
  for (const ref of refs) {
    const pokemon = ref?.pokemon ?? ref
    const id = idFromUrl(pokemon?.url)
    if (!id || id > 10000) continue
    const species = speciesById.get(id)
    if (!species) continue
    if (byId.has(id)) continue
    byId.set(id, cardFromSpecies(species, id, typeSlots?.get(id) ?? []))
  }
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

function relationTypes(refs: Json[] | undefined, typeMap: Map<string, TypeInfo>) {
  return (refs ?? []).map((ref) => ({
    name: String(ref.name),
    label: typeMap.get(ref.name)?.label ?? humanize(ref.name),
  }))
}

function evolutionNode(node: Json): EvolutionNode {
  const name = String(node.species?.name ?? '')
  return {
    name,
    label: humanize(name),
    children: (node.evolves_to ?? []).map((child: Json) => evolutionNode(child)),
  }
}

export async function loadHome(input: {
  q?: string
  type?: string
  generation?: string
  page?: number
}): Promise<HomeData> {
  const [speciesList, types, generations, typeSlots] = await Promise.all([
    getSpeciesList(),
    getAllTypes(),
    getGenerations(),
    getTypeSlots(),
  ])

  let species = speciesList
  const typeName = typeof input.type === 'string' ? input.type : ''
  const generationName = typeof input.generation === 'string' ? input.generation : ''
  const q = typeof input.q === 'string' ? input.q : ''

  if (typeName) {
    const type = types.find((entry) => entry.name === typeName)
    if (type) {
      const ids = new Set<number>()
      for (const entry of type.record.pokemon ?? []) {
        const id = idFromUrl(entry?.pokemon?.url)
        if (id && id <= 10000) ids.add(id)
      }
      species = species.filter((entry) => ids.has(entry.id))
    }
  }

  if (generationName) {
    const generation = generations.find((entry) => entry.name === generationName)
    if (generation) {
      const ids = new Set<number>()
      for (const entry of generation.record.pokemon_species ?? []) {
        const id = idFromUrl(entry?.url)
        if (id) ids.add(id)
      }
      species = species.filter((entry) => ids.has(entry.id))
    }
  }

  const needle = q.trim().toLowerCase()
  if (needle) {
    species = species.filter((entry) => humanize(entry.name).toLowerCase().includes(needle))
  }

  species = [...species].sort((a, b) => a.id - b.id)
  const count = species.length
  const perPage = 48
  const totalPages = count ? Math.ceil(count / perPage) : 0
  const requestedPage = Math.max(1, Number(input.page) || 1)
  const page = totalPages ? Math.min(requestedPage, totalPages) : 1
  const start = (page - 1) * perPage
  const cards = species
    .slice(start, start + perPage)
    .map((entry) => cardFromSpecies(entry, entry.id, typeSlots.get(entry.id) ?? []))

  return {
    count,
    page,
    totalPages,
    cards,
    types: types.map((entry) => ({ name: entry.name, label: entry.label })),
    generations: generations.map((entry) => ({ name: entry.name, label: entry.label })),
    q,
    type: typeName,
    generation: generationName,
  }
}

export async function loadPokemonPage(
  speciesName: string,
  requestedGame?: string,
): Promise<PokemonPageData | null> {
  const species = await getSpecies(speciesName)
  if (!species) return null

  const speciesId = Number(species.id)
  const [pokemon, chain, typeMap] = await Promise.all([
    getPokemon(species.id),
    (async () => {
      const chainId = idFromUrl(species.evolution_chain?.url ?? '')
      return chainId ? getEvolutionChain(chainId) : null
    })(),
    getTypeMap(),
  ])
  if (!pokemon) return null
  const typeRecords = [...(pokemon.types ?? [])]
    .sort((a: Json, b: Json) => Number(a.slot) - Number(b.slot))
    .map((entry: Json) => ({
      name: String(entry.type?.name ?? ''),
      label: typeMap.get(entry.type?.name)?.label ?? humanize(entry.type?.name ?? ''),
    }))

  const englishName = englishEntry(species.names, 'name') ?? humanize(species.name)
  const genus = englishEntry(species.genera, 'genus') ?? '—'
  const flavor = latestEnglishFlavor(species.flavor_text_entries) ?? '—'

  const gameNames = new Set<string>()
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail?.version_group?.name) gameNames.add(detail.version_group.name)
    }
  }
  const gameRecords = await Promise.all([...gameNames].map((name) => getVersionGroup(name)))
  const games = [...gameNames]
    .map((name) => {
      const record = gameRecords.find((item) => item?.name === name)
      return { name, order: Number(record?.order ?? 0), label: humanize(name) }
    })
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
  const gameOptions: FilterOption[] = games.map(({ name, label }) => ({ name, label }))

  let selectedGame = gameOptions.some((entry) => entry.name === requestedGame)
    ? String(requestedGame)
    : gameOptions.at(-1)?.name ?? ''

  const selectedDetails: Array<{
    move: Json
    method: string
    level: number | null
    order: number | null
  }> = []
  if (selectedGame) {
    for (const moveEntry of pokemon.moves ?? []) {
      for (const detail of moveEntry.version_group_details ?? []) {
        if (detail?.version_group?.name !== selectedGame) continue
        selectedDetails.push({
          move: moveEntry.move,
          method: String(detail.move_learn_method?.name ?? 'unknown'),
          level: detail.level_learned_at === null ? null : Number(detail.level_learned_at),
          order: detail.order === null ? null : Number(detail.order),
        })
      }
    }
  }

  const moveNames = [...new Set(selectedDetails.map((detail) => String(detail.move.name)))]
  const moveRecords = await Promise.all(moveNames.map((name) => getMove(name)))
  const moveByName = new Map<string, Json>()
  moveNames.forEach((name, index) => moveByName.set(name, moveRecords[index]))

  const rowsByMethod = new Map<string, any[]>()
  const seen = new Set<string>()
  for (const detail of selectedDetails) {
    const move = moveByName.get(String(detail.move.name))
    if (!move) continue
    const key = `${detail.method}|${move.name}|${detail.level}`
    if (seen.has(key)) continue
    seen.add(key)
    const typeName = String(move.type?.name ?? '')
    const row = {
      level: detail.level,
      moveName: String(move.name),
      moveLabel: englishEntry(move.names, 'name') ?? humanize(move.name),
      typeName,
      typeLabel: typeMap.get(typeName)?.label ?? humanize(typeName),
      category: humanize(move.damage_class?.name ?? ''),
      power: move.power === null || move.power === undefined ? null : Number(move.power),
      accuracy:
        move.accuracy === null || move.accuracy === undefined ? null : Number(move.accuracy),
      pp: move.pp === null || move.pp === undefined ? null : Number(move.pp),
      method: detail.method,
    }
    const list = rowsByMethod.get(detail.method) ?? []
    list.push(row)
    rowsByMethod.set(detail.method, list)
  }

  const methodRank = (name: string) => {
    const order = ['level-up', 'machine', 'egg', 'tutor']
    const index = order.indexOf(name)
    return index === -1 ? order.length : index
  }
  const methodNames = [...rowsByMethod.keys()].sort((a, b) => {
    const order = methodRank(a) - methodRank(b)
    return order || humanize(a).localeCompare(humanize(b))
  })

  const moveTables: MoveTableData[] = []
  for (const method of methodNames) {
    const rows = rowsByMethod.get(method) ?? []
    if (!rows.length) continue
    if (method === 'level-up') {
      rows.sort(
        (a, b) =>
          (a.level ?? Number.MAX_SAFE_INTEGER) - (b.level ?? Number.MAX_SAFE_INTEGER) ||
          a.moveLabel.localeCompare(b.moveLabel),
      )
    } else {
      rows.sort((a, b) => a.moveLabel.localeCompare(b.moveLabel))
    }
    moveTables.push({ method, label: humanize(method), rows })
  }

  const stats: Array<{ label: string; value: number }> = (pokemon.stats ?? []).map(
    (entry: Json) => ({
      label: STAT_LABELS[entry.stat?.name] ?? humanize(entry.stat?.name ?? ''),
      value: Number(entry.base_stat ?? 0),
    }),
  )
  const total = stats.reduce((sum, stat) => sum + stat.value, 0)

  const sprites = pokemon.sprites ?? {}
  const artwork = mediaUrl(
    sprites.other?.['official-artwork']?.front_default ?? sprites.front_default ?? null,
  )

  return {
    found: true,
    name: String(pokemon.name ?? species.name),
    speciesName: String(species.name),
    englishName,
    dexNumber: `#${String(speciesId).padStart(4, '0')}`,
    genus,
    flavor,
    height: Number(pokemon.height ?? 0),
    weight: Number(pokemon.weight ?? 0),
    artwork,
    sprite: mediaUrl(sprites.front_default),
    types: typeRecords,
    stats,
    total,
    abilities: [...(pokemon.abilities ?? [])]
      .sort((a: Json, b: Json) => Number(a.slot) - Number(b.slot))
      .map((entry: Json) => ({
        name: String(entry.ability?.name ?? ''),
        label: humanize(entry.ability?.name ?? ''),
        hidden: Boolean(entry.is_hidden),
      })),
    evolution: chain?.chain ? evolutionNode(chain.chain) : null,
    games: gameOptions,
    selectedGame,
    moveTables,
  }
}

export async function loadMovePage(name: string): Promise<MovePageData | null> {
  const move = await getMove(name)
  if (!move) return null

  const [speciesById, typeMap] = await Promise.all([getSpeciesById(), getTypeMap()])
  const typeName = String(move.type?.name ?? '')
  let effect = englishEntry(move.effect_entries, 'short_effect')
  if (!effect) effect = latestEnglishFlavor(move.flavor_text_entries)
  if (!effect) effect = '—'

  return {
    found: true,
    name: String(move.name),
    label: englishEntry(move.names, 'name') ?? humanize(move.name),
    type: {
      name: typeName,
      label: typeMap.get(typeName)?.label ?? humanize(typeName),
    },
    category: humanize(move.damage_class?.name ?? ''),
    power: move.power === null || move.power === undefined ? null : Number(move.power),
    accuracy:
      move.accuracy === null || move.accuracy === undefined ? null : Number(move.accuracy),
    pp: move.pp === null || move.pp === undefined ? null : Number(move.pp),
    effect,
    pokemon: cardsFromPokemonRefs(move.learned_by_pokemon ?? [], speciesById),
  }
}

export async function loadAbilityPage(name: string): Promise<AbilityPageData | null> {
  const ability = await getAbility(name)
  if (!ability) return null

  const speciesById = await getSpeciesById()
  const byId = new Map<number, PokemonCardData>()
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry?.pokemon?.url)
    if (!id || id > 10000) continue
    const species = speciesById.get(id)
    if (!species) continue
    const existing = byId.get(id)
    const hidden = Boolean(entry.is_hidden)
    if (existing) {
      existing.hidden = Boolean(existing.hidden || hidden)
      continue
    }
    byId.set(id, { ...cardFromSpecies(species, id), hidden })
  }

  return {
    found: true,
    name: String(ability.name),
    label: englishEntry(ability.names, 'name') ?? humanize(ability.name),
    effect: englishEntry(ability.effect_entries, 'short_effect') ?? '—',
    pokemon: [...byId.values()].sort((a, b) => a.id - b.id),
  }
}

export async function loadTypeList(): Promise<TypeListData> {
  const types = await getAllTypes()
  return types.map((entry) => ({ name: entry.name, label: entry.label }))
}

export async function loadTypePage(name: string): Promise<TypePageData | null> {
  const type = await getType(name)
  if (!type || EXCLUDED_TYPES.has(type.name)) return null

  const [speciesById, types] = await Promise.all([getSpeciesById(), getAllTypes()])
  const typeMap = new Map(types.map((entry) => [entry.name, entry]))
  const relations: DamageRelation[] = [
    {
      label: 'Super effective against',
      types: relationTypes(type.damage_relations?.double_damage_to, typeMap),
    },
    {
      label: 'Not very effective against',
      types: relationTypes(type.damage_relations?.half_damage_to, typeMap),
    },
    {
      label: 'No effect against',
      types: relationTypes(type.damage_relations?.no_damage_to, typeMap),
    },
    {
      label: 'Weak to',
      types: relationTypes(type.damage_relations?.double_damage_from, typeMap),
    },
    {
      label: 'Resists',
      types: relationTypes(type.damage_relations?.half_damage_from, typeMap),
    },
    {
      label: 'Immune to',
      types: relationTypes(type.damage_relations?.no_damage_from, typeMap),
    },
  ]

  const moves = [...(type.moves ?? [])]
    .sort((a: Json, b: Json) => String(a.name).localeCompare(String(b.name)))
    .map((entry: Json) => ({ name: String(entry.name), label: humanize(entry.name) }))

  return {
    found: true,
    name: String(type.name),
    label: typeMap.get(type.name)?.label ?? humanize(type.name),
    relations,
    pokemon: cardsFromPokemonRefs(type.pokemon ?? [], speciesById),
    moves,
  }
}
