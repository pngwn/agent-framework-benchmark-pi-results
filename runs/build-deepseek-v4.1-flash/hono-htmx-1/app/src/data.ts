const BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '')

export const PAGE_SIZE = 48

const jsonCache = new Map<string, Promise<any>>()

class HttpError extends Error {
  status: number
  constructor(status: number) {
    super(`API request failed with ${status}`)
    this.status = status
  }
}

function requestPath(urlOrPath: string): string {
  if (/^https?:\/\//.test(urlOrPath)) {
    const url = new URL(urlOrPath)
    return url.pathname + url.search
  }
  return urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`
}

export function getJson(urlOrPath: string): Promise<any> {
  const path = requestPath(urlOrPath)
  let pending = jsonCache.get(path)
  if (!pending) {
    pending = fetch(`${BASE}${path}`, { headers: { accept: 'application/json' } }).then(async (res) => {
      if (!res.ok) throw new HttpError(res.status)
      return res.json()
    })
    pending.catch(() => jsonCache.delete(path))
    jsonCache.set(path, pending)
  }
  return pending
}

export async function tryGetJson(urlOrPath: string): Promise<any | null> {
  try {
    return await getJson(urlOrPath)
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return null
    throw err
  }
}

export function parseId(urlOrPath: string): number {
  const match = requestPath(urlOrPath).match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : 0
}

export function humanize(name: string): string {
  return String(name)
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}

export function englishName(entries: any[] | undefined, key = 'name'): string | null {
  const entry = entries?.find((item) => item?.language?.name === 'en')
  return entry?.[key] ?? null
}

export function collapseWhitespace(text: string): string {
  return String(text).replace(/\s+/g, ' ').trim()
}

export function latestEnglishFlavor(entries: any[] | undefined): string | null {
  if (!entries?.length) return null
  const english = entries.filter((entry) => entry?.language?.name === 'en')
  const last = english[english.length - 1]
  return last?.flavor_text ? collapseWhitespace(last.flavor_text) : null
}

export function spriteUrl(pokemonId: number): string {
  return `${BASE}/media/sprites/pokemon/${pokemonId}.png`
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++
      if (index >= items.length) return
      results[index] = await fn(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

const TYPES_TO_EXCLUDE = new Set(['stellar', 'unknown', 'shadow'])

export type TypeInfo = {
  id: number
  name: string
  english: string
  detail: any
}

export type GenerationInfo = {
  id: number
  name: string
  english: string
  speciesIds: number[]
}

export type SpeciesInfo = {
  id: number
  name: string
  humanized: string
  types: { name: string; english: string; slot: number }[]
}

export type GlobalData = {
  species: SpeciesInfo[]
  speciesById: Map<number, SpeciesInfo>
  speciesByName: Map<string, SpeciesInfo>
  types: TypeInfo[]
  typeByName: Map<string, TypeInfo>
  generations: GenerationInfo[]
  generationByName: Map<string, GenerationInfo>
  generationBySpecies: Map<number, string>
}

let globalPromise: Promise<GlobalData> | null = null

export function getGlobal(): Promise<GlobalData> {
  if (!globalPromise) {
    globalPromise = loadGlobal()
    globalPromise.catch(() => {
      globalPromise = null
    })
  }
  return globalPromise
}

async function loadGlobal(): Promise<GlobalData> {
  const [speciesList, typeList, generationList] = await Promise.all([
    getJson('/api/v2/pokemon-species/?limit=100000'),
    getJson('/api/v2/type/?limit=1000'),
    getJson('/api/v2/generation/?limit=1000'),
  ])

  const typeResults = (typeList.results as any[]).filter((entry) => !TYPES_TO_EXCLUDE.has(entry.name))
  const [typeDetails, generationDetails] = await Promise.all([
    mapLimit(typeResults, 18, (entry) => getJson(entry.url)),
    mapLimit(generationList.results as any[], 9, (entry) => getJson(entry.url)),
  ])

  const species: SpeciesInfo[] = (speciesList.results as any[])
    .map((entry) => ({
      id: parseId(entry.url),
      name: entry.name,
      humanized: humanize(entry.name),
      types: [] as SpeciesInfo['types'],
    }))
    .filter((entry) => entry.id > 0)
    .sort((a, b) => a.id - b.id)

  const speciesById = new Map(species.map((entry) => [entry.id, entry]))
  const speciesByName = new Map(species.map((entry) => [entry.name, entry]))

  const types: TypeInfo[] = typeResults.map((entry, index) => {
    const detail = typeDetails[index]
    return {
      id: parseId(entry.url),
      name: detail.name,
      english: englishName(detail.names) ?? humanize(detail.name),
      detail,
    }
  })
  const typeByName = new Map(types.map((type) => [type.name, type]))

  const generations: GenerationInfo[] = (generationList.results as any[])
    .map((entry, index) => {
      const detail = generationDetails[index]
      return {
        id: parseId(entry.url),
        name: detail.name,
        english: englishName(detail.names) ?? humanize(detail.name),
        speciesIds: (detail.pokemon_species as any[]).map((item) => parseId(item.url)).filter(Boolean),
      }
    })
    .sort((a, b) => a.id - b.id)
  const generationByName = new Map(generations.map((generation) => [generation.name, generation]))

  const generationBySpecies = new Map<number, string>()
  for (const generation of generations) {
    for (const id of generation.speciesIds) generationBySpecies.set(id, generation.name)
  }

  // The type endpoints are the cheapest complete source for "default Pokémon -> types".
  // Alternate forms have IDs above 10000 and are deliberately ignored.
  for (const type of types) {
    for (const entry of type.detail.pokemon as any[]) {
      const id = parseId(entry.pokemon.url)
      if (!id || id > 10000) continue
      const target = speciesById.get(id)
      if (!target) continue
      target.types.push({ name: type.name, english: type.english, slot: entry.slot ?? 0 })
    }
  }
  for (const entry of species) entry.types.sort((a, b) => a.slot - b.slot)

  return {
    species,
    speciesById,
    speciesByName,
    types,
    typeByName,
    generations,
    generationByName,
    generationBySpecies,
  }
}

let versionGroupsPromise: Promise<Map<string, any>> | null = null

export function getVersionGroups(): Promise<Map<string, any>> {
  if (!versionGroupsPromise) {
    versionGroupsPromise = (async () => {
      const list = await getJson('/api/v2/version-group/?limit=1000')
      const details = await mapLimit(list.results as any[], 20, (entry) => getJson(entry.url))
      return new Map(details.map((detail) => [detail.name, detail]))
    })()
    versionGroupsPromise.catch(() => {
      versionGroupsPromise = null
    })
  }
  return versionGroupsPromise
}

export type CardInfo = {
  id: number
  name: string
  humanized: string
  sprite: string
  hidden?: boolean
}

export function cardForSpecies(species: SpeciesInfo, hidden = false): CardInfo {
  return {
    id: species.id,
    name: species.name,
    humanized: species.humanized,
    sprite: spriteUrl(species.id),
    hidden,
  }
}

export function speciesCardsFromPokemonRefs(
  refs: any[],
  global: GlobalData,
  hiddenIds?: Set<number>,
): CardInfo[] {
  const seen = new Map<number, CardInfo>()
  for (const ref of refs) {
    const id = parseId(ref.pokemon?.url ?? ref.url ?? '')
    if (!id || id > 10000) continue
    const species = global.speciesById.get(id)
    if (!species || seen.has(id)) continue
    seen.set(id, cardForSpecies(species, hiddenIds?.has(id) ?? false))
  }
  return [...seen.values()].sort((a, b) => a.id - b.id)
}

export async function getHomeData(q: string, typeName: string, generationName: string, page: number) {
  const global = await getGlobal()
  const query = q.trim().toLowerCase()
  const selectedType = global.typeByName.get(typeName) ?? null
  const selectedGeneration = global.generationByName.get(generationName) ?? null

  let matches = global.species
  if (query) matches = matches.filter((species) => species.humanized.toLowerCase().includes(query))
  if (selectedType) {
    matches = matches.filter((species) => species.types.some((type) => type.name === selectedType.name))
  }
  if (selectedGeneration) {
    const allowed = new Set(selectedGeneration.speciesIds)
    matches = matches.filter((species) => allowed.has(species.id))
  }

  const total = matches.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, page || 1), totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const visible = matches.slice(start, start + PAGE_SIZE)

  return {
    global,
    query: q.trim(),
    selectedType,
    selectedGeneration,
    total,
    currentPage,
    totalPages,
    species: visible,
  }
}

export async function getPokemonData(name: string, gameQuery: string) {
  const species = await tryGetJson(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`)
  if (!species) return null

  const global = await getGlobal()
  const variety = (species.varieties as any[])?.find((item) => item.is_default) ?? species.varieties?.[0]
  if (!variety) return null
  const pokemon = await tryGetJson(variety.pokemon.url)
  if (!pokemon) return null

  const [chain, versionGroups] = await Promise.all([
    species.evolution_chain ? tryGetJson(species.evolution_chain.url) : Promise.resolve(null),
    getVersionGroups(),
  ])

  const games = new Set<string>()
  for (const move of pokemon.moves as any[]) {
    for (const detail of move.version_group_details as any[]) {
      games.add(detail.version_group.name)
    }
  }
  const gameOptions = [...games]
    .map((game) => ({
      name: game,
      label: humanize(game),
      order: versionGroups.get(game)?.order ?? 0,
    }))
    .sort((a, b) => a.order - b.order)

  let selectedGame =
    gameOptions.find((game) => game.name === gameQuery)?.name ??
    gameOptions[gameOptions.length - 1]?.name ??
    ''
  if (!gameOptions.some((game) => game.name === selectedGame)) selectedGame = ''

  return {
    global,
    species,
    pokemon,
    chain,
    englishName: englishName(species.names) ?? humanize(species.name),
    genus: englishName(species.genera, 'genus') ?? '—',
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    gameOptions,
    selectedGame,
  }
}

export type MoveTableRow = {
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

export type MoveTable = {
  method: string
  label: string
  rows: MoveTableRow[]
  hasLevel: boolean
}

export async function getMoveTables(
  pokemon: any,
  selectedGame: string,
  global: GlobalData,
): Promise<MoveTable[]> {
  if (!selectedGame) return []
  const raw = new Map<string, Map<string, { level: number; moveName: string }>>()
  for (const move of pokemon.moves as any[]) {
    for (const detail of move.version_group_details as any[]) {
      if (detail.version_group.name !== selectedGame) continue
      const method = detail.move_learn_method.name
      if (!raw.has(method)) raw.set(method, new Map())
      raw.get(method)!.set(move.move.name, {
        level: detail.level_learned_at ?? 0,
        moveName: move.move.name,
      })
    }
  }
  if (!raw.size) return []

  const allMoveNames = [...new Set([...raw.values()].flatMap((moves) => [...moves.keys()]))]
  const moveDetails = await mapLimit(allMoveNames, 40, async (moveName) => {
    try {
      return await getJson(`/api/v2/move/${encodeURIComponent(moveName)}/`)
    } catch {
      return null
    }
  })
  const moveByName = new Map(allMoveNames.map((name, index) => [name, moveDetails[index]]))

  const methodOrder = (method: string) => {
    const index = ['level-up', 'machine', 'egg', 'tutor'].indexOf(method)
    return index === -1 ? 100 : index
  }
  const methods = [...raw.keys()].sort((a, b) => {
    const order = methodOrder(a) - methodOrder(b)
    return order || humanize(a).localeCompare(humanize(b))
  })

  return methods.map((method) => {
    const rows = [...raw.get(method)!.values()].map((entry) => {
      const move = moveByName.get(entry.moveName)
      const typeName = move?.type?.name ?? ''
      return {
        level: method === 'level-up' ? entry.level : null,
        moveName: entry.moveName,
        moveLabel: move ? englishName(move.names) ?? humanize(move.name) : humanize(entry.moveName),
        typeName,
        typeLabel: global.typeByName.get(typeName)?.english ?? humanize(typeName),
        category: move?.damage_class?.name ? humanize(move.damage_class.name) : '—',
        power: move?.power ?? null,
        accuracy: move?.accuracy ?? null,
        pp: move?.pp ?? null,
      }
    })
    return { method, label: humanize(method), rows, hasLevel: method === 'level-up' }
  })
}

export async function getMoveData(name: string) {
  const move = await tryGetJson(`/api/v2/move/${encodeURIComponent(name)}/`)
  if (!move) return null
  const global = await getGlobal()
  const typeName = move.type?.name ?? ''
  const type = global.typeByName.get(typeName)
  const learnedBy = speciesCardsFromPokemonRefs(move.learned_by_pokemon ?? [], global)
  const shortEffect = englishName(move.effect_entries, 'short_effect')
  const flavor = latestEnglishFlavor(move.flavor_text_entries)
  return {
    move,
    englishName: englishName(move.names) ?? humanize(move.name),
    typeName,
    typeLabel: type?.english ?? humanize(typeName),
    category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
    effect: shortEffect ?? flavor ?? '—',
    learnedBy,
  }
}

export async function getAbilityData(name: string) {
  const ability = await tryGetJson(`/api/v2/ability/${encodeURIComponent(name)}/`)
  if (!ability) return null
  const global = await getGlobal()
  const hiddenIds = new Set<number>()
  const refs: any[] = []
  for (const entry of ability.pokemon as any[]) {
    const id = parseId(entry.pokemon?.url ?? '')
    if (!id || id > 10000 || !global.speciesById.has(id)) continue
    refs.push(entry)
    if (entry.is_hidden) hiddenIds.add(id)
  }
  const pokemon = speciesCardsFromPokemonRefs(refs, global, hiddenIds)
  return {
    ability,
    englishName: englishName(ability.names) ?? humanize(ability.name),
    effect: englishName(ability.effect_entries, 'short_effect') ?? '—',
    pokemon,
  }
}

export async function getTypeData(name: string) {
  const global = await getGlobal()
  const type = global.typeByName.get(name)
  if (!type) return null
  const pokemon = speciesCardsFromPokemonRefs(type.detail.pokemon ?? [], global)
  const moves = ((type.detail.moves as any[]) ?? [])
    .map((move) => ({ name: move.name, label: humanize(move.name) }))
    .sort((a, b) => a.label.localeCompare(b.label))
  return {
    global,
    type,
    pokemon,
    moves,
    relations: [
      ['Super effective against', 'double_damage_to'],
      ['Not very effective against', 'half_damage_to'],
      ['No effect against', 'no_damage_to'],
      ['Weak to', 'double_damage_from'],
      ['Resists', 'half_damage_from'],
      ['Immune to', 'no_damage_from'],
    ].map(([label, key]) => ({
      label,
      types: ((type.detail.damage_relations?.[key] as any[]) ?? []).map((item) => ({
        name: item.name,
        label: global.typeByName.get(item.name)?.english ?? humanize(item.name),
      })),
    })),
  }
}

export function formatMeasurement(value: number, divisor: number, unit: string): string {
  return `${(value / divisor).toFixed(1)} ${unit}`
}

export function displayValue(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value)
}
