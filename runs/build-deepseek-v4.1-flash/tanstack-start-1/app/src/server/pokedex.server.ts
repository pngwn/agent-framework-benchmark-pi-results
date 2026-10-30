import type {
  AbilityPageData,
  CardData,
  CatalogSpecies,
  EvolutionNode,
  HomeData,
  MovePageData,
  MoveRow,
  MoveTable,
  NotFoundData,
  PokemonPageData,
  TypeListData,
  TypePageData,
  TypeRef,
} from '~/lib/types'

const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '')
const API_ROOT = `${API_BASE}/api/v2`

type Json = any

type Catalog = {
  species: CatalogSpecies[]
  speciesById: Map<number, CatalogSpecies>
  speciesByName: Map<string, CatalogSpecies>
  types: TypeRef[]
  typeByName: Map<string, TypeRef>
  typeDetails: Map<string, Json>
  generations: Array<{ name: string; label: string }>
  generationBySpecies: Map<number, string>
}

const requestCache = new Map<string, Promise<Json | null>>()
let catalogPromise: Promise<Catalog> | null = null

function apiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  if (pathOrUrl.startsWith('/')) return `${API_BASE}${pathOrUrl}`
  return `${API_ROOT}/${pathOrUrl.replace(/^\//, '')}`
}

async function fetchJson(pathOrUrl: string): Promise<Json | null> {
  const url = apiUrl(pathOrUrl)
  let pending = requestCache.get(url)
  if (!pending) {
    pending = (async () => {
      const response = await fetch(url, { headers: { accept: 'application/json' } })
      if (response.status === 404) return null
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${url}`)
      }
      return (await response.json()) as Json
    })()
    requestCache.set(url, pending)
    pending.catch(() => requestCache.delete(url))
  }
  return pending
}

async function fetchList(resource: string): Promise<Json[]> {
  const data = await fetchJson(`${API_ROOT}/${resource}/?limit=100000`)
  return Array.isArray(data?.results) ? data.results : []
}

function idFromUrl(url: string | undefined | null): number | null {
  if (!url) return null
  const match = String(url).match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : null
}

export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function englishName(names: Json[] | undefined, fallback: string): string {
  return names?.find((entry) => entry?.language?.name === 'en')?.name ?? fallback
}

function englishGenus(genera: Json[] | undefined): string {
  return genera?.find((entry) => entry?.language?.name === 'en')?.genus ?? '—'
}

function latestEnglishFlavor(entries: Json[] | undefined): string {
  const english = (entries ?? []).filter((entry) => entry?.language?.name === 'en')
  const text = english.at(-1)?.flavor_text ?? ''
  return String(text).replace(/\s+/g, ' ').trim()
}

function englishEffect(entries: Json[] | undefined): string | null {
  return entries?.find((entry) => entry?.language?.name === 'en')?.short_effect ?? null
}

function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

function typeRef(catalog: Catalog, name: string): TypeRef {
  return catalog.typeByName.get(name) ?? { name, label: humanize(name) }
}

function cardForSpecies(
  species: CatalogSpecies,
  options: { includeTypes?: boolean; hiddenAbility?: boolean } = {},
): CardData {
  return {
    speciesName: species.name,
    displayName: species.displayName,
    dexNumber: `#${String(species.id).padStart(4, '0')}`,
    sprite: species.sprite,
    ...(options.includeTypes ? { types: species.types } : {}),
    ...(options.hiddenAbility ? { hiddenAbility: true } : {}),
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++
      if (index >= items.length) return
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

async function buildCatalog(): Promise<Catalog> {
  const [speciesResults, typeResults, generationResults] = await Promise.all([
    fetchList('pokemon-species'),
    fetchList('type'),
    fetchList('generation'),
  ])

  const wantedTypeNames = typeResults
    .map((entry) => String(entry.name))
    .filter((name) => !['stellar', 'unknown', 'shadow'].includes(name))

  const [typeDetails, generationDetails] = await Promise.all([
    mapLimit(wantedTypeNames, 18, (name) => fetchJson(`type/${name}`)),
    mapLimit(generationResults, 9, (entry) => fetchJson(entry.url)),
  ])

  const types: TypeRef[] = []
  const typeByName = new Map<string, TypeRef>()
  const typeDetailsByName = new Map<string, Json>()
  for (let i = 0; i < wantedTypeNames.length; i += 1) {
    const name = wantedTypeNames[i]
    const detail = typeDetails[i]
    if (!detail) continue
    const ref = { name, label: englishName(detail.names, humanize(name)) }
    types.push(ref)
    typeByName.set(name, ref)
    typeDetailsByName.set(name, detail)
  }

  const generations = generationDetails
    .filter(Boolean)
    .map((detail) => ({
      id: Number(detail.id),
      name: String(detail.name),
      label: englishName(detail.names, humanize(String(detail.name))),
    }))
    .sort((a, b) => a.id - b.id)
  const generationBySpecies = new Map<number, string>()
  for (const detail of generationDetails) {
    if (!detail) continue
    for (const entry of detail.pokemon_species ?? []) {
      const id = idFromUrl(entry.url)
      if (id !== null && id < 10000) generationBySpecies.set(id, String(detail.name))
    }
  }

  const speciesRows = speciesResults
    .map((entry) => ({ name: String(entry.name), id: idFromUrl(entry.url) }))
    .filter((entry): entry is { name: string; id: number } => entry.id !== null && entry.id < 10000)
    .sort((a, b) => a.id - b.id)

  const pokemonDetails = await mapLimit(speciesRows, 40, (entry) => fetchJson(`pokemon/${entry.id}`))

  const species: CatalogSpecies[] = []
  const speciesById = new Map<number, CatalogSpecies>()
  const speciesByName = new Map<string, CatalogSpecies>()

  for (let i = 0; i < speciesRows.length; i += 1) {
    const entry = speciesRows[i]
    const pokemon = pokemonDetails[i]
    if (!pokemon) continue
    const pokemonTypes = [...(pokemon.types ?? [])]
      .sort((a, b) => Number(a.slot) - Number(b.slot))
      .map((slot) => typeRef({ typeByName } as Catalog, String(slot.type.name)))
    const row: CatalogSpecies = {
      id: entry.id,
      name: entry.name,
      displayName: humanize(entry.name),
      sprite: pokemon.sprites?.front_default ?? null,
      types: pokemonTypes,
      generation: generationBySpecies.get(entry.id) ?? null,
    }
    species.push(row)
    speciesById.set(row.id, row)
    speciesByName.set(row.name, row)
  }

  return {
    species,
    speciesById,
    speciesByName,
    types,
    typeByName,
    typeDetails: typeDetailsByName,
    generations: generations.map(({ name, label }) => ({ name, label })),
    generationBySpecies,
  }
}

async function getCatalog(): Promise<Catalog> {
  if (!catalogPromise) {
    catalogPromise = buildCatalog().catch((error) => {
      catalogPromise = null
      throw error
    })
  }
  return catalogPromise
}

function speciesForPokemon(catalog: Catalog, ref: { name: string; url: string }): CatalogSpecies | null {
  const id = idFromUrl(ref.url)
  if (id === null || id >= 10000) return null
  return catalog.speciesById.get(id) ?? null
}

function buildEvolutionNode(catalog: Catalog, raw: Json): EvolutionNode {
  const name = String(raw.species.name)
  return {
    name,
    label: humanize(name),
    children: (raw.evolves_to ?? []).map((child: Json) => buildEvolutionNode(catalog, child)),
  }
}

function categoryLabel(move: Json): string {
  return move.damage_class?.name ? humanize(String(move.damage_class.name)) : '—'
}

export async function getHomeData(): Promise<HomeData> {
  const catalog = await getCatalog()
  return {
    species: catalog.species,
    types: catalog.types,
    generations: catalog.generations,
  }
}

export async function getPokemonPage(name: string, game?: string): Promise<PokemonPageData | NotFoundData> {
  const catalog = await getCatalog()
  const species = await fetchJson(`pokemon-species/${encodeURIComponent(name.toLowerCase())}`)
  if (!species) return { found: false }

  const varieties = species.varieties ?? []
  const defaultVariety = varieties.find((variety: Json) => variety.is_default) ?? varieties[0]
  if (!defaultVariety?.pokemon) return { found: false }

  const [pokemon, chain] = await Promise.all([
    fetchJson(defaultVariety.pokemon.url),
    species.evolution_chain?.url ? fetchJson(species.evolution_chain.url) : Promise.resolve(null),
  ])
  if (!pokemon) return { found: false }

  const stats = (pokemon.stats ?? []).map((entry: Json) => {
    const statName = String(entry.stat.name)
    const labels: Record<string, string> = {
      hp: 'HP',
      attack: 'Attack',
      defense: 'Defense',
      'special-attack': 'Sp. Atk',
      'special-defense': 'Sp. Def',
      speed: 'Speed',
    }
    return { label: labels[statName] ?? humanize(statName), value: Number(entry.base_stat) }
  })

  const gamesByName = new Map<string, { name: string; label: string; order: number; url: string }>()
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      const group = detail.version_group
      if (!group?.name || gamesByName.has(group.name)) continue
      gamesByName.set(group.name, { name: group.name, label: humanize(group.name), order: 0, url: group.url })
    }
  }

  const gameRecords = await mapLimit([...gamesByName.values()], 12, async (game) => {
    const detail = await fetchJson(game.url)
    return { ...game, order: Number(detail?.order ?? 0) }
  })
  const games = gameRecords
    .map(({ name: gameName, label, order }) => ({ name: gameName, label, order }))
    .sort((a, b) => a.order - b.order)

  const requestedGame = game ? games.find((entry) => entry.name === game) : undefined
  const selectedGame = requestedGame ?? [...games].sort((a, b) => b.order - a.order)[0] ?? null

  const moveEntries: Array<{ moveUrl: string; moveName: string; method: string; level: number | null }> = []
  if (selectedGame) {
    for (const move of pokemon.moves ?? []) {
      const details = (move.version_group_details ?? []).filter(
        (detail: Json) => detail.version_group?.name === selectedGame.name,
      )
      if (!details.length) continue
      const detail = details[0]
      moveEntries.push({
        moveUrl: move.move.url,
        moveName: String(move.move.name),
        method: String(detail.move_learn_method.name),
        level: detail.level_learned_at === null || detail.level_learned_at === undefined
          ? null
          : Number(detail.level_learned_at),
      })
    }
  }

  const moveDetails = await mapLimit(moveEntries, 32, (entry) => fetchJson(entry.moveUrl))

  const grouped = new Map<string, MoveRow[]>()
  for (let i = 0; i < moveEntries.length; i += 1) {
    const entry = moveEntries[i]
    const move = moveDetails[i]
    if (!move) continue
    const typeName = String(move.type?.name ?? 'normal')
    const row: MoveRow = {
      moveName: entry.moveName,
      moveLabel: englishName(move.names, humanize(entry.moveName)),
      type: typeRef(catalog, typeName),
      category: categoryLabel(move),
      power: move.power === null || move.power === undefined ? null : Number(move.power),
      accuracy: move.accuracy === null || move.accuracy === undefined ? null : Number(move.accuracy),
      pp: move.pp === null || move.pp === undefined ? null : Number(move.pp),
      level: entry.level,
    }
    const rows = grouped.get(entry.method) ?? []
    rows.push(row)
    grouped.set(entry.method, rows)
  }

  const preferredMethods = ['level-up', 'machine', 'egg', 'tutor']
  const methodKeys = [...grouped.keys()].sort((a, b) => {
    const aPreferred = preferredMethods.indexOf(a)
    const bPreferred = preferredMethods.indexOf(b)
    if (aPreferred !== -1 || bPreferred !== -1) {
      if (aPreferred === -1) return 1
      if (bPreferred === -1) return -1
      return aPreferred - bPreferred
    }
    return humanize(a).localeCompare(humanize(b))
  })

  const moveTables: MoveTable[] = methodKeys.map((method) => {
    const rows = [...(grouped.get(method) ?? [])]
    if (method === 'level-up') {
      rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.moveLabel.localeCompare(b.moveLabel))
    } else {
      rows.sort((a, b) => a.moveLabel.localeCompare(b.moveLabel))
    }
    return { method, label: humanize(method), rows }
  })

  const evolution: EvolutionNode = chain?.chain
    ? buildEvolutionNode(catalog, chain.chain)
    : { name: String(species.name), label: humanize(String(species.name)), children: [] }

  return {
    found: true,
    name: String(species.name),
    englishName: englishName(species.names, humanize(String(species.name))),
    dexNumber: dexNumber(Number(species.id)),
    genus: englishGenus(species.genera),
    flavorText: latestEnglishFlavor(species.flavor_text_entries),
    artwork:
      pokemon.sprites?.other?.['official-artwork']?.front_default ??
      pokemon.sprites?.front_default ??
      null,
    height: `${(Number(pokemon.height) / 10).toFixed(1)} m`,
    weight: `${(Number(pokemon.weight) / 10).toFixed(1)} kg`,
    types: (pokemon.types ?? [])
      .slice()
      .sort((a: Json, b: Json) => Number(a.slot) - Number(b.slot))
      .map((entry: Json) => typeRef(catalog, String(entry.type.name))),
    stats,
    statsTotal: stats.reduce((sum: number, stat: { value: number }) => sum + stat.value, 0),
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a: Json, b: Json) => Number(a.slot) - Number(b.slot))
      .map((entry: Json) => ({
        name: String(entry.ability.name),
        label: humanize(String(entry.ability.name)),
        hidden: Boolean(entry.is_hidden),
      })),
    evolution,
    games,
    selectedGame: selectedGame?.name ?? null,
    moveTables,
  }
}

export async function getMovePage(name: string): Promise<MovePageData | NotFoundData> {
  const catalog = await getCatalog()
  const move = await fetchJson(`move/${encodeURIComponent(name.toLowerCase())}`)
  if (!move) return { found: false }

  const seen = new Set<number>()
  const learnedBy: CardData[] = []
  for (const ref of move.learned_by_pokemon ?? []) {
    const species = speciesForPokemon(catalog, ref)
    if (!species || seen.has(species.id)) continue
    seen.add(species.id)
    learnedBy.push(cardForSpecies(species))
  }
  learnedBy.sort((a, b) => Number(a.dexNumber.slice(1)) - Number(b.dexNumber.slice(1)))

  return {
    found: true,
    name: String(move.name),
    englishName: englishName(move.names, humanize(String(move.name))),
    type: typeRef(catalog, String(move.type?.name ?? 'normal')),
    category: categoryLabel(move),
    power: move.power === null || move.power === undefined ? null : Number(move.power),
    accuracy: move.accuracy === null || move.accuracy === undefined ? null : Number(move.accuracy),
    pp: move.pp === null || move.pp === undefined ? null : Number(move.pp),
    effect: englishEffect(move.effect_entries) || latestEnglishFlavor(move.flavor_text_entries) || '—',
    learnedBy,
  }
}

export async function getAbilityPage(name: string): Promise<AbilityPageData | NotFoundData> {
  const catalog = await getCatalog()
  const ability = await fetchJson(`ability/${encodeURIComponent(name.toLowerCase())}`)
  if (!ability) return { found: false }

  const bySpecies = new Map<number, CardData>()
  for (const entry of ability.pokemon ?? []) {
    const species = speciesForPokemon(catalog, entry.pokemon)
    if (!species) continue
    const existing = bySpecies.get(species.id)
    const hidden = Boolean(entry.is_hidden)
    if (existing) {
      if (hidden) existing.hiddenAbility = true
    } else {
      bySpecies.set(species.id, cardForSpecies(species, { hiddenAbility: hidden }))
    }
  }
  const pokemon = [...bySpecies.values()].sort(
    (a, b) => Number(a.dexNumber.slice(1)) - Number(b.dexNumber.slice(1)),
  )

  return {
    found: true,
    name: String(ability.name),
    englishName: englishName(ability.names, humanize(String(ability.name))),
    effect: englishEffect(ability.effect_entries) || latestEnglishFlavor(ability.flavor_text_entries) || '—',
    pokemon,
  }
}

export async function getTypeList(): Promise<TypeListData> {
  const catalog = await getCatalog()
  return { types: catalog.types }
}

export async function getTypePage(name: string): Promise<TypePageData | NotFoundData> {
  const catalog = await getCatalog()
  const typeName = name.toLowerCase()
  const detail = catalog.typeDetails.get(typeName)
  if (!detail) return { found: false }

  const relationDefinitions: Array<[string, string]> = [
    ['Super effective against', 'double_damage_to'],
    ['Not very effective against', 'half_damage_to'],
    ['No effect against', 'no_damage_to'],
    ['Weak to', 'double_damage_from'],
    ['Resists', 'half_damage_from'],
    ['Immune to', 'no_damage_from'],
  ]

  const relations = relationDefinitions.map(([term, key]) => ({
    term,
    types: (detail.damage_relations?.[key] ?? []).map((entry: Json) => typeRef(catalog, String(entry.name))),
  }))

  const pokemon = catalog.species
    .filter((species) => species.types.some((type) => type.name === typeName))
    .map((species) => cardForSpecies(species))

  const moves = (detail.moves ?? [])
    .map((entry: Json) => ({ name: String(entry.name), label: humanize(String(entry.name)) }))
    .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))

  return {
    found: true,
    name: typeName,
    englishName: englishName(detail.names, humanize(typeName)),
    relations,
    pokemon,
    moves,
  }
}
