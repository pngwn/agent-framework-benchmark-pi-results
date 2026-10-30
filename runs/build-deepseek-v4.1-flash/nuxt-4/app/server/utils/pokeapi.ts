import {
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
  mediaPath,
  statLabel,
} from './format'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const isApiNotFound = (error: unknown) =>
  error instanceof ApiError && error.status === 404

const apiBase = () =>
  (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '')

const responseCache = new Map<string, Promise<any>>()

export function apiFetch<T = any>(path: string): Promise<T> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const target = `${apiBase()}/api/v2${cleanPath}`

  const cached = responseCache.get(target)
  if (cached) return cached

  const request = (async () => {
    let response: Response
    try {
      response = await fetch(target, { signal: AbortSignal.timeout(20_000) })
    } catch (error: any) {
      throw new ApiError(503, `Could not reach the API: ${error?.message ?? error}`)
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw new ApiError(response.status, `API request failed (${response.status}): ${target}`)
    }
    return (await response.json()) as T
  })()

  responseCache.set(target, request)
  request.catch(() => responseCache.delete(target))
  return request
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])

export type Catalog = {
  types: Array<{ id: number; name: string; englishName: string }>
  generations: Array<{ id: number; name: string; englishName: string }>
  versionGroups: Array<{
    id: number
    name: string
    order: number
    label: string
  }>
  species: Array<{
    id: number
    name: string
    generation: string | null
    types: Array<{ name: string; slot: number }>
  }>
  typesById: Map<number, { id: number; name: string; englishName: string }>
  typesByName: Map<string, { id: number; name: string; englishName: string }>
  speciesById: Map<
    number,
    {
      id: number
      name: string
      generation: string | null
      types: Array<{ name: string; slot: number }>
    }
  >
}

let catalogPromise: Promise<Catalog> | null = null

export function getCatalog(): Promise<Catalog> {
  if (!catalogPromise) {
    catalogPromise = buildCatalog().catch((error) => {
      catalogPromise = null
      throw error
    })
  }
  return catalogPromise
}

async function buildCatalog(): Promise<Catalog> {
  const [speciesPage, typeIndex, generationIndex, versionGroupIndex] =
    await Promise.all([
      apiFetch<any>('/pokemon-species/?limit=100000'),
      apiFetch<any>('/type/?limit=100'),
      apiFetch<any>('/generation/?limit=100'),
      apiFetch<any>('/version-group/?limit=100'),
    ])

  const rawTypes = (typeIndex.results ?? []).filter(
    (entry: any) => !EXCLUDED_TYPES.has(entry.name),
  )

  const typeDetails = await Promise.all(
    rawTypes.map(async (entry: any) => {
      const id = idFromUrl(entry.url) ?? 0
      return apiFetch<any>(`/type/${id || entry.name}/`)
    }),
  )

  const types = rawTypes.map((entry: any, index: number) => ({
    id: idFromUrl(entry.url) ?? typeDetails[index]?.id ?? 0,
    name: entry.name,
    englishName: englishName(typeDetails[index]?.names) || humanize(entry.name),
  }))

  const typeByPokemonId = new Map<
    number,
    Array<{ name: string; slot: number }>
  >()
  for (const type of typeDetails) {
    for (const entry of type.pokemon ?? []) {
      const id = idFromUrl(entry?.pokemon?.url)
      if (!id || id > 10000) continue
      const list = typeByPokemonId.get(id) ?? []
      list.push({ name: type.name, slot: Number(entry.slot) || list.length + 1 })
      typeByPokemonId.set(id, list)
    }
  }
  for (const list of typeByPokemonId.values()) {
    list.sort((a, b) => a.slot - b.slot)
  }

  const generationDetails = await Promise.all(
    (generationIndex.results ?? []).map((entry: any) => {
      const id = idFromUrl(entry.url)
      return apiFetch<any>(`/generation/${id || entry.name}/`)
    }),
  )

  const generationBySpeciesId = new Map<number, string>()
  const generations = generationDetails
    .map((generation: any) => ({
      id: Number(generation.id),
      name: generation.name,
      englishName: englishName(generation.names) || humanize(generation.name),
    }))
    .sort((a, b) => a.id - b.id)

  for (const generation of generationDetails) {
    for (const entry of generation.pokemon_species ?? []) {
      const id = idFromUrl(entry?.url)
      if (!id || id > 10000) continue
      generationBySpeciesId.set(id, generation.name)
    }
  }

  const versionGroupDetails = await Promise.all(
    (versionGroupIndex.results ?? []).map((entry: any) => {
      const id = idFromUrl(entry.url)
      return apiFetch<any>(`/version-group/${id || entry.name}/`)
    }),
  )

  const versionGroups = versionGroupDetails
    .map((group: any) => ({
      id: Number(group.id),
      name: group.name,
      order: Number(group.order) || 0,
      label: humanize(group.name),
    }))
    .sort((a, b) => a.order - b.order || a.id - b.id)

  const species = (speciesPage.results ?? [])
    .map((entry: any) => {
      const id = idFromUrl(entry.url)
      if (!id || id > 10000) return null
      return {
        id,
        name: entry.name,
        generation: generationBySpeciesId.get(id) ?? null,
        types: typeByPokemonId.get(id) ?? [],
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.id - b.id) as Catalog['species']

  const typesById = new Map(types.map((type) => [type.id, type]))
  const typesByName = new Map(types.map((type) => [type.name, type]))
  const speciesById = new Map(species.map((entry) => [entry.id, entry]))

  return {
    types,
    generations,
    versionGroups,
    species,
    typesById,
    typesByName,
    speciesById,
  }
}

export function publicCatalog(catalog: Catalog) {
  return {
    types: catalog.types,
    generations: catalog.generations,
    versionGroups: catalog.versionGroups,
    species: catalog.species,
  }
}

export async function getPokemonRecord(name: string) {
  const species = await apiFetch<any>(
    `/pokemon-species/${encodeURIComponent(name)}/`,
  )
  const defaultVariety = (species.varieties ?? []).find(
    (variety: any) => variety.is_default,
  )?.pokemon
  const pokemonId = idFromUrl(defaultVariety?.url) ?? Number(species.id)

  let pokemon: any
  try {
    pokemon = await apiFetch<any>(`/pokemon/${pokemonId}/`)
  } catch (error) {
    if (!defaultVariety?.name) throw error
    pokemon = await apiFetch<any>(
      `/pokemon/${encodeURIComponent(defaultVariety.name)}/`,
    )
  }

  return { species, pokemon }
}

export function cardForSpecies(id: number, catalog: Catalog) {
  const species = catalog.speciesById.get(id)
  if (!species) return null
  return speciesCard(species)
}

export function speciesCard(species: {
  id: number
  name: string
}) {
  return {
    id: Number(species.id),
    name: species.name,
    humanized: humanize(species.name),
  }
}

export function moveTypeLabel(
  typeName: string,
  catalog: Catalog,
): string {
  return catalog.typesByName.get(typeName)?.englishName ?? humanize(typeName)
}

export function buildEvolutionTree(node: any): any {
  if (!node?.species) return null
  const speciesId = idFromUrl(node.species.url)
  return {
    id: speciesId,
    name: node.species.name,
    humanized: humanize(node.species.name),
    evolvesTo: (node.evolves_to ?? [])
      .map((child: any) => buildEvolutionTree(child))
      .filter(Boolean),
  }
}

export async function getPokemonPage(name: string) {
  let record: Awaited<ReturnType<typeof getPokemonRecord>>
  try {
    record = await getPokemonRecord(name)
  } catch (error) {
    if (isApiNotFound(error)) return { found: false as const }
    throw error
  }

  const { species, pokemon } = record
  const catalog = await getCatalog()

  let evolution = null
  const chainId = idFromUrl(species.evolution_chain?.url)
  if (chainId) {
    try {
      const chain = await apiFetch<any>(`/evolution-chain/${chainId}/`)
      evolution = buildEvolutionTree(chain.chain)
    } catch (error) {
      if (!isApiNotFound(error)) throw error
    }
  }

  const games = new Set<string>()
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail?.version_group?.name) games.add(detail.version_group.name)
    }
  }
  const versionGroups = catalog.versionGroups
    .filter((group) => games.has(group.name))
    .map((group) => ({
      name: group.name,
      label: group.label,
      order: group.order,
    }))

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ||
    pokemon.sprites?.front_default ||
    null

  const typeEntries = [...(pokemon.types ?? [])].sort(
    (a: any, b: any) => Number(a.slot) - Number(b.slot),
  )

  const stats = (pokemon.stats ?? []).map((entry: any) => ({
    name: entry.stat?.name ?? '',
    label: statLabel(entry.stat?.name ?? ''),
    value: Number(entry.base_stat) || 0,
  }))

  return {
    found: true as const,
    species: {
      id: Number(species.id),
      name: species.name,
      englishName: englishName(species.names) || humanize(species.name),
      genus: englishValue(species.genera, 'genus'),
      flavorText: latestEnglishFlavor(species.flavor_text_entries),
    },
    pokemon: {
      height: (Number(pokemon.height) / 10).toFixed(1),
      weight: (Number(pokemon.weight) / 10).toFixed(1),
      artwork: artwork ? mediaPath(artwork) : '',
      types: typeEntries.map((entry: any) => ({
        name: entry.type?.name ?? '',
        label: moveTypeLabel(entry.type?.name ?? '', catalog),
      })),
      abilities: [...(pokemon.abilities ?? [])]
        .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
        .map((entry: any) => ({
          name: entry.ability?.name ?? '',
          label: humanize(entry.ability?.name),
          hidden: Boolean(entry.is_hidden),
        })),
      stats: {
        rows: stats,
        total: stats.reduce((sum: number, stat: any) => sum + stat.value, 0),
      },
    },
    evolution,
    games: versionGroups,
  }
}

function uniqueMoveNamesForGame(pokemon: any, game: string): string[] {
  const names = new Set<string>()
  for (const entry of pokemon.moves ?? []) {
    const matching = (entry.version_group_details ?? []).filter(
      (detail: any) => detail?.version_group?.name === game,
    )
    if (matching.length > 0 && entry.move?.name) names.add(entry.move.name)
  }
  return [...names]
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await mapper(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

export async function getPokemonMoves(name: string, requestedGame?: string) {
  let record: Awaited<ReturnType<typeof getPokemonRecord>>
  try {
    record = await getPokemonRecord(name)
  } catch (error) {
    if (isApiNotFound(error)) return { found: false as const }
    throw error
  }

  const { pokemon } = record
  const catalog = await getCatalog()
  const gameNames = new Set<string>()
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail?.version_group?.name) gameNames.add(detail.version_group.name)
    }
  }

  const games = catalog.versionGroups
    .filter((group) => gameNames.has(group.name))
    .map((group) => ({
      name: group.name,
      label: group.label,
      order: group.order,
    }))

  const selectedGame =
    requestedGame && gameNames.has(requestedGame)
      ? requestedGame
      : games[games.length - 1]?.name ?? ''

  if (!selectedGame) {
    return { found: true as const, game: '', games, methods: [] }
  }

  const moveNames = uniqueMoveNamesForGame(pokemon, selectedGame)
  const moveRecords = await mapLimit(moveNames, 32, async (moveName) => {
    try {
      return await apiFetch<any>(`/move/${encodeURIComponent(moveName)}/`)
    } catch (error) {
      if (isApiNotFound(error)) return null
      throw error
    }
  })
  const moveByName = new Map<string, any>()
  for (const move of moveRecords) {
    if (move?.name) moveByName.set(move.name, move)
  }

  const rowMap = new Map<string, any>()
  for (const entry of pokemon.moves ?? []) {
    const matching = (entry.version_group_details ?? []).filter(
      (detail: any) => detail?.version_group?.name === selectedGame,
    )
    if (matching.length === 0) continue
    const detail = matching[0]
    const methodName = detail?.move_learn_method?.name ?? 'other'
    const move = moveByName.get(entry.move?.name)
    if (!move) continue
    const key = `${methodName}:${move.name}`
    if (rowMap.has(key)) continue
    rowMap.set(key, {
      method: methodName,
      level: Number(detail.level_learned_at) || 0,
      moveName: move.name,
      moveLabel: englishName(move.names) || humanize(move.name),
      typeName: move.type?.name ?? '',
      typeLabel: moveTypeLabel(move.type?.name ?? '', catalog),
      category: humanize(move.damage_class?.name),
      power: move.power === null || move.power === undefined ? null : Number(move.power),
      accuracy:
        move.accuracy === null || move.accuracy === undefined
          ? null
          : Number(move.accuracy),
      pp: move.pp === null || move.pp === undefined ? null : Number(move.pp),
    })
  }

  const methodNames = [...new Set([...rowMap.values()].map((row) => row.method))]
  const preferred = ['level-up', 'machine', 'egg', 'tutor']
  methodNames.sort((a, b) => {
    const ai = preferred.indexOf(a)
    const bi = preferred.indexOf(b)
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    }
    return humanize(a).localeCompare(humanize(b))
  })

  const methods = methodNames.map((method) => ({
    name: method,
    label: humanize(method),
    rows: [...rowMap.values()].filter((row) => row.method === method),
  }))

  return { found: true as const, game: selectedGame, games, methods }
}

export async function getMovePage(name: string) {
  let move: any
  try {
    move = await apiFetch<any>(`/move/${encodeURIComponent(name)}/`)
  } catch (error) {
    if (isApiNotFound(error)) return { found: false as const }
    throw error
  }

  const catalog = await getCatalog()
  const effect =
    englishValue(move.effect_entries, 'short_effect') ||
    latestEnglishFlavor(move.flavor_text_entries) ||
    '—'

  const cardsById = new Map<number, ReturnType<typeof speciesCard>>()
  for (const entry of move.learned_by_pokemon ?? []) {
    const id = idFromUrl(entry?.url)
    if (!id || id > 10000) continue
    const card = cardForSpecies(id, catalog)
    if (card) cardsById.set(id, card)
  }

  return {
    found: true as const,
    move: {
      id: Number(move.id),
      name: move.name,
      englishName: englishName(move.names) || humanize(move.name),
      typeName: move.type?.name ?? '',
      typeLabel: moveTypeLabel(move.type?.name ?? '', catalog),
      category: humanize(move.damage_class?.name),
      power: move.power === null || move.power === undefined ? null : Number(move.power),
      accuracy:
        move.accuracy === null || move.accuracy === undefined
          ? null
          : Number(move.accuracy),
      pp: move.pp === null || move.pp === undefined ? null : Number(move.pp),
      effect,
    },
    pokemon: [...cardsById.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, card]) => card),
  }
}

export async function getAbilityPage(name: string) {
  let ability: any
  try {
    ability = await apiFetch<any>(`/ability/${encodeURIComponent(name)}/`)
  } catch (error) {
    if (isApiNotFound(error)) return { found: false as const }
    throw error
  }

  const catalog = await getCatalog()
  const cardsById = new Map<
    number,
    ReturnType<typeof speciesCard> & { hidden: boolean }
  >()
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry?.pokemon?.url)
    if (!id || id > 10000) continue
    const card = cardForSpecies(id, catalog)
    if (!card) continue
    const existing = cardsById.get(id)
    cardsById.set(id, {
      ...card,
      hidden: Boolean(existing?.hidden || entry.is_hidden),
    })
  }

  return {
    found: true as const,
    ability: {
      id: Number(ability.id),
      name: ability.name,
      englishName: englishName(ability.names) || humanize(ability.name),
      effect: englishValue(ability.effect_entries, 'short_effect') || '—',
    },
    pokemon: [...cardsById.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, card]) => card),
  }
}

const RELATION_KEYS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
] as const

export async function getTypePage(name: string) {
  let type: any
  try {
    type = await apiFetch<any>(`/type/${encodeURIComponent(name)}/`)
  } catch (error) {
    if (isApiNotFound(error)) return { found: false as const }
    throw error
  }

  const catalog = await getCatalog()

  const relations = RELATION_KEYS.map(([label, key]) => ({
    label,
    types: ((type.damage_relations?.[key] ?? []) as any[]).map((entry) => ({
      name: entry.name,
      label: moveTypeLabel(entry.name, catalog),
    })),
  }))

  const cardsById = new Map<number, ReturnType<typeof speciesCard>>()
  for (const entry of type.pokemon ?? []) {
    const id = idFromUrl(entry?.pokemon?.url)
    if (!id || id > 10000) continue
    const card = cardForSpecies(id, catalog)
    if (card) cardsById.set(id, card)
  }

  const moves = [...(type.moves ?? [])]
    .map((entry: any) => ({
      name: entry.name,
      label: humanize(entry.name),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return {
    found: true as const,
    type: {
      id: Number(type.id),
      name: type.name,
      englishName: englishName(type.names) || humanize(type.name),
    },
    relations,
    pokemon: [...cardsById.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, card]) => card),
    moves,
  }
}
