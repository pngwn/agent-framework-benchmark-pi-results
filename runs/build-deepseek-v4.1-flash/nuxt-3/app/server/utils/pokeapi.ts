/* Runtime access to the local PokeAPI server. Everything is fetched over HTTP at
   request time and cached in memory for the lifetime of the app process. */

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '')

type Ref = { name: string; url: string }
type NamedResource = Ref & { id?: number }

export type TypeInfo = { id: number; name: string; english: string }
export type GenerationInfo = { id: number; name: string; english: string }

export type PokemonIndexEntry = {
  id: number
  speciesName: string
  name: string
  sprite: string
  types: TypeInfo[]
  generation: string | null
}

export type PokedexIndex = {
  pokemon: PokemonIndexEntry[]
  types: TypeInfo[]
  generations: GenerationInfo[]
  byId: Map<number, PokemonIndexEntry>
  typesByName: Map<string, TypeInfo>
  generationsByName: Map<string, GenerationInfo>
}

const cache = new Map<string, Promise<any>>()

export function humanize(name: string): string {
  return String(name || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function idFromUrl(url: string | undefined): number | null {
  const match = String(url || '').match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : null
}

function absolute(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const clean = path.replace(/^\/+/, '').replace(/^api\/v2\//, '')
  return `${API_BASE}/api/v2/${clean}`
}

export async function apiGet<T = any>(path: string): Promise<T | null> {
  const url = apiUrl(path)
  const cached = cache.get(url)
  if (cached) return cached

  const promise = (async () => {
    const response = await fetch(url, { headers: { accept: 'application/json' } })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`PokeAPI request failed (${response.status}): ${url}`)
    return (await response.json()) as T
  })()

  cache.set(url, promise)
  try {
    return await promise
  } catch (error) {
    cache.delete(url)
    throw error
  }
}

export function englishName(resource: any): string {
  return (
    resource?.names?.find((entry: any) => entry?.language?.name === 'en')?.name ||
    humanize(resource?.name || '')
  )
}

export function englishGenus(species: any): string {
  return species?.genera?.find((entry: any) => entry?.language?.name === 'en')?.genus || ''
}

export function collapseWhitespace(text: string | null | undefined): string {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

export function latestEnglishFlavor(resource: any): string {
  const entries = resource?.flavor_text_entries || []
  const english = entries.filter((entry: any) => entry?.language?.name === 'en')
  return collapseWhitespace(english.length ? english[english.length - 1].flavor_text : '')
}

export function englishShortEffect(resource: any): string {
  const effects = resource?.effect_entries || []
  const english = effects.find((entry: any) => entry?.language?.name === 'en')
  return collapseWhitespace(english?.short_effect || '')
}

export function spriteForId(id: number): string {
  return `${API_BASE}/media/sprites/pokemon/${id}.png`
}

let indexPromise: Promise<PokedexIndex> | null = null

export function getPokedexIndex(): Promise<PokedexIndex> {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((error) => {
      indexPromise = null
      throw error
    })
  }
  return indexPromise
}

async function buildIndex(): Promise<PokedexIndex> {
  const [speciesList, typeList, generationList] = await Promise.all([
    apiGet<any>('pokemon-species?limit=10000'),
    apiGet<any>('type?limit=1000'),
    apiGet<any>('generation?limit=1000'),
  ])

  const excludedTypes = new Set(['stellar', 'unknown', 'shadow'])
  const typeRefs = (typeList?.results || []) as NamedResource[]
  const typeRefsFiltered = typeRefs.filter((entry) => !excludedTypes.has(entry.name))

  const [typeDetails, generationDetails] = await Promise.all([
    Promise.all(
      typeRefsFiltered.map(async (entry) => {
        const id = idFromUrl(entry.url)
        return id ? await apiGet<any>(`type/${id}`) : null
      }),
    ),
    Promise.all(
      (generationList?.results || []).map(async (entry: Ref) => {
        const id = idFromUrl(entry.url)
        return id ? await apiGet(`generation/${id}`) : null
      }),
    ),
  ])

  // Keep these aligned with the API's list order, which is the order shown in the UI.
  const types: TypeInfo[] = typeRefsFiltered.map((entry) => {
    const id = idFromUrl(entry.url) || 0
    const detail = typeDetails.find((item) => item?.id === id)
    return { id, name: entry.name, english: englishName(detail || entry) }
  })
  const typesByName = new Map(types.map((type) => [type.name, type]))

  const generations: GenerationInfo[] = generationDetails
    .filter(Boolean)
    .map((detail: any) => ({
      id: detail.id,
      name: detail.name,
      english: englishName(detail),
    }))
    .sort((a, b) => a.id - b.id)
  const generationsByName = new Map(generations.map((generation) => [generation.name, generation]))

  const typeByPokemon = new Map<number, Array<{ slot: number; type: TypeInfo }>>()
  for (const detail of typeDetails) {
    if (!detail) continue
    const typeInfo = typesByName.get(detail.name)
    if (!typeInfo) continue
    for (const item of detail.pokemon || []) {
      const id = idFromUrl(item?.pokemon?.url)
      if (!id || id > 10000) continue
      const list = typeByPokemon.get(id) || []
      list.push({ slot: Number(item.slot ?? 98), type: typeInfo })
      typeByPokemon.set(id, list)
    }
  }

  const generationBySpecies = new Map<number, string>()
  for (const detail of generationDetails) {
    if (!detail) continue
    for (const species of detail.pokemon_species || []) {
      const id = idFromUrl(species.url)
      if (id) generationBySpecies.set(id, detail.name)
    }
  }

  const pokemon: PokemonIndexEntry[] = (speciesList?.results || [])
    .map((entry: Ref) => {
      const id = idFromUrl(entry.url)
      if (!id) return null
      return {
        id,
        speciesName: entry.name,
        name: humanize(entry.name),
        sprite: spriteForId(id),
        types: (typeByPokemon.get(id) || [])
          .sort((a, b) => a.slot - b.slot)
          .map((item) => item.type),
        generation: generationBySpecies.get(id) || null,
      }
    })
    .filter(Boolean)
    .sort((a: PokemonIndexEntry, b: PokemonIndexEntry) => a.id - b.id) as PokemonIndexEntry[]

  const byId = new Map(pokemon.map((entry) => [entry.id, entry]))

  return {
    pokemon,
    types,
    generations,
    byId,
    typesByName,
    generationsByName,
  }
}


export function cardFromRef(index: PokedexIndex, ref: Ref | undefined) {
  if (!ref) return null
  const id = idFromUrl(ref.url)
  if (!id || id > 10000) return null
  const entry = index.byId.get(id)
  if (entry) return entry
  return {
    id,
    speciesName: ref.name,
    name: humanize(ref.name),
    sprite: spriteForId(id),
    types: [],
    generation: null,
  }
}

export function cardsFromRefs(index: PokedexIndex, refs: Ref[] | undefined) {
  const seen = new Set<number>()
  const cards: PokemonIndexEntry[] = []
  for (const ref of refs || []) {
    const card = cardFromRef(index, ref)
    if (!card || seen.has(card.id)) continue
    seen.add(card.id)
    cards.push(card)
  }
  return cards.sort((a, b) => a.id - b.id)
}

export async function getPokemonPageData(name: string) {
  const [index, species] = await Promise.all([
    getPokedexIndex(),
    apiGet<any>(`pokemon-species/${encodeURIComponent(name)}`),
  ])
  if (!species) return { notFound: true as const }

  const id = Number(species.id)
  const pokemon = await apiGet<any>(`pokemon/${id}`)
  if (!pokemon) return { notFound: true as const }

  const statLabels: Record<string, string> = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
  }

  const stats = (pokemon.stats || []).map((stat: any) => ({
    name: stat.stat?.name,
    label: statLabels[stat.stat?.name] || humanize(stat.stat?.name || ''),
    value: Number(stat.base_stat ?? 0),
  }))
  const statTotal = stats.reduce((sum: number, stat: any) => sum + stat.value, 0)

  const types = (pokemon.types || [])
    .slice()
    .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
    .map((item: any) => {
      const typeName = item.type?.name
      const info = index.typesByName.get(typeName)
      return {
        name: typeName,
        english: info?.english || humanize(typeName),
      }
    })

  const abilities = (pokemon.abilities || [])
    .slice()
    .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
    .map((item: any) => ({
      name: item.ability?.name,
      label: humanize(item.ability?.name || ''),
      hidden: Boolean(item.is_hidden),
    }))

  let evolution: any = null
  const chainId = idFromUrl(species.evolution_chain?.url)
  if (chainId) {
    const chain = await apiGet<any>(`evolution-chain/${chainId}`)
    evolution = mapEvolutionNode(chain?.chain)
  }

  const versionGroupNames = new Set<string>()
  for (const move of pokemon.moves || []) {
    for (const detail of move.version_group_details || []) {
      if (detail.version_group?.name) versionGroupNames.add(detail.version_group.name)
    }
  }

  const versionGroups = await Promise.all(
    [...versionGroupNames].map(async (groupName) => {
      const detail = await apiGet<any>(`version-group/${encodeURIComponent(groupName)}`)
      return {
        name: groupName,
        label: humanize(groupName),
        order: Number(detail?.order ?? 0),
      }
    }),
  )
  versionGroups.sort((a, b) => a.order - b.order)

  const moveNames = new Set<string>()
  for (const move of pokemon.moves || []) {
    if (move.move?.name) moveNames.add(move.move.name)
  }
  const moveEntries = await Promise.all(
    [...moveNames].map(async (moveName) => {
      const detail = await apiGet<any>(`move/${encodeURIComponent(moveName)}`)
      return [moveName, detail] as const
    }),
  )
  const moveDetails = new Map(moveEntries)

  const groups: Record<string, any> = {}
  for (const group of versionGroups) groups[group.name] = { ...group, rows: [] as any[] }

  for (const move of pokemon.moves || []) {
    const moveName = move.move?.name
    if (!moveName) continue
    const detail = moveDetails.get(moveName)
    const typeName = detail?.type?.name || ''
    const typeInfo = index.typesByName.get(typeName)
    for (const learned of move.version_group_details || []) {
      const groupName = learned.version_group?.name
      if (!groupName || !groups[groupName]) continue
      groups[groupName].rows.push({
        method: learned.move_learn_method?.name || '',
        methodLabel: humanize(learned.move_learn_method?.name || ''),
        level: Number(learned.level_learned_at ?? 0),
        moveName,
        moveLabel: detail ? englishName(detail) : humanize(moveName),
        typeName,
        typeLabel: typeInfo?.english || humanize(typeName),
        category: detail?.damage_class?.name || '',
        categoryLabel: humanize(detail?.damage_class?.name || ''),
        power: detail?.power ?? null,
        accuracy: detail?.accuracy ?? null,
        pp: detail?.pp ?? null,
      })
    }
  }

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ||
    pokemon.sprites?.front_default ||
    null

  return {
    notFound: false as const,
    id,
    speciesName: species.name,
    name: englishName(species),
    genus: englishGenus(species),
    flavor: latestEnglishFlavor(species),
    artwork: artwork ? absolute(artwork) : null,
    sprite: spriteForId(id),
    types,
    height: Number(pokemon.height ?? 0) / 10,
    weight: Number(pokemon.weight ?? 0) / 10,
    stats,
    statTotal,
    abilities,
    evolution,
    games: versionGroups,
    moveGroups: groups,
  }
}

function mapEvolutionNode(node: any): any {
  if (!node) return null
  return {
    speciesName: node.species?.name,
    name: humanize(node.species?.name || ''),
    children: (node.evolves_to || []).map(mapEvolutionNode).filter(Boolean),
  }
}

export async function getMovePageData(name: string) {
  const [index, move] = await Promise.all([
    getPokedexIndex(),
    apiGet<any>(`move/${encodeURIComponent(name)}`),
  ])
  if (!move) return { notFound: true as const }

  const typeInfo = index.typesByName.get(move.type?.name)
  const effect = englishShortEffect(move) || latestEnglishFlavor(move) || '—'
  const cards = cardsFromRefs(index, move.learned_by_pokemon)

  return {
    notFound: false as const,
    id: move.id,
    name: englishName(move),
    typeName: move.type?.name || '',
    typeLabel: typeInfo?.english || humanize(move.type?.name || ''),
    category: humanize(move.damage_class?.name || ''),
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    cards,
  }
}

export async function getAbilityPageData(name: string) {
  const [index, ability] = await Promise.all([
    getPokedexIndex(),
    apiGet<any>(`ability/${encodeURIComponent(name)}`),
  ])
  if (!ability) return { notFound: true as const }

  const hidden = new Map<number, boolean>()
  for (const item of ability.pokemon || []) {
    const id = idFromUrl(item?.pokemon?.url)
    if (!id || id > 10000) continue
    hidden.set(id, Boolean(hidden.get(id) || item.is_hidden))
  }
  const cards = cardsFromRefs(index, (ability.pokemon || []).map((item: any) => item.pokemon)).map(
    (card) => ({ ...card, hidden: Boolean(hidden.get(card.id)) }),
  )

  return {
    notFound: false as const,
    id: ability.id,
    name: englishName(ability),
    effect: englishShortEffect(ability) || '—',
    cards,
  }
}

export async function getTypePageData(name: string) {
  const [index, type] = await Promise.all([
    getPokedexIndex(),
    apiGet<any>(`type/${encodeURIComponent(name)}`),
  ])
  if (!type) return { notFound: true as const }
  const typeInfo = index.typesByName.get(type.name)
  if (!typeInfo) return { notFound: true as const }

  const relationKeys = [
    ['double_damage_to', 'Super effective against'],
    ['half_damage_to', 'Not very effective against'],
    ['no_damage_to', 'No effect against'],
    ['double_damage_from', 'Weak to'],
    ['half_damage_from', 'Resists'],
    ['no_damage_from', 'Immune to'],
  ] as const

  const relations = relationKeys.map(([key, label]) => ({
    label,
    types: ((type.damage_relations?.[key] || []) as Ref[]).map((ref) => {
      const info = index.typesByName.get(ref.name)
      return { name: ref.name, english: info?.english || humanize(ref.name) }
    }),
  }))

  const cards = cardsFromRefs(index, (type.pokemon || []).map((item: any) => item.pokemon))
  const moves = (type.moves || [])
    .map((ref: Ref) => ({ name: ref.name, label: humanize(ref.name) }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))

  return {
    notFound: false as const,
    id: type.id,
    name: englishName(type),
    relations,
    cards,
    moves,
  }
}
