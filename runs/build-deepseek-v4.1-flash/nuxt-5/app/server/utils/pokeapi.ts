// Runtime data access for the local PokeAPI server.
//
// Nothing here runs at build time: every cache is populated lazily by a request.
const API_BASE = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '')

type Ref = { name?: string; url: string }
type NamedRef = { name: string; url: string }
type TypeMeta = { name: string; label: string }
type GenerationMeta = { name: string; label: string }
type VersionGroupMeta = { name: string; label: string; order: number }

type SpeciesSummary = {
  id: number
  name: string
  displayName: string
  sprite: string | null
  types: TypeMeta[]
  generation: GenerationMeta | null
}

type DexIndex = {
  species: SpeciesSummary[]
  types: TypeMeta[]
  generations: GenerationMeta[]
}

const rawCache = new Map<string, Promise<any>>()
let typeMetasPromise: Promise<TypeMeta[]> | null = null
let versionGroupsPromise: Promise<VersionGroupMeta[]> | null = null
let dexIndexPromise: Promise<DexIndex> | null = null
const preparedMoves = new Map<string, Promise<any>>()

const VALID_TYPE_NAMES = new Set([
  'normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel',
  'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy',
])

export function humanize(name: string): string {
  return String(name || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function collapseWhitespace(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function englishName(names: any[] | undefined, fallback: string): string {
  const found = Array.isArray(names) ? names.find((entry) => entry?.language?.name === 'en') : null
  return found?.name || found?.genus || humanize(fallback)
}

function latestEnglishFlavor(entries: any[] | undefined): string {
  if (!Array.isArray(entries)) return ''
  const english = entries.filter((entry) => entry?.language?.name === 'en')
  const last = english[english.length - 1]
  return last ? collapseWhitespace(last.flavor_text) : ''
}

function idFromUrl(url: string): number {
  const match = String(url || '').match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : 0
}

function apiPathFromUrl(url: string): string {
  const parsed = new URL(url, 'http://local.invalid')
  return parsed.pathname.replace(/^\/api\/v2\//, '').replace(/^\/+|\/+$/g, '')
}

function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE}/${String(url).replace(/^\/+/, '')}`
}

async function apiGet(path: string): Promise<any> {
  const key = path.replace(/^\/+/, '')
  const existing = rawCache.get(key)
  if (existing) return existing

  const promise = (async () => {
    const response = await fetch(`${API_BASE}/api/v2/${key}`)
    if (!response.ok) {
      const error: any = new Error(`PokeAPI ${response.status} for ${key}`)
      error.statusCode = response.status
      throw error
    }
    return response.json()
  })()

  rawCache.set(key, promise)
  promise.catch(() => rawCache.delete(key))
  return promise
}

async function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function worker() {
    while (true) {
      const index = next++
      if (index >= items.length) return
      results[index] = await mapper(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

async function getTypeMetas(): Promise<TypeMeta[]> {
  if (!typeMetasPromise) {
    typeMetasPromise = (async () => {
      const list = await apiGet('type/?limit=100000')
      const refs = (list.results as NamedRef[]).filter((ref) => VALID_TYPE_NAMES.has(ref.name))
      const details = await Promise.all(refs.map((ref) => apiGet(apiPathFromUrl(ref.url))))
      return details.map((type: any) => ({
        name: type.name,
        label: englishName(type.names, type.name),
      }))
    })().catch((error) => {
      typeMetasPromise = null
      throw error
    })
  }
  return typeMetasPromise
}

async function getVersionGroups(): Promise<VersionGroupMeta[]> {
  if (!versionGroupsPromise) {
    versionGroupsPromise = (async () => {
      const list = await apiGet('version-group/?limit=100000')
      const details = await Promise.all(
        (list.results as Ref[]).map((ref) => apiGet(apiPathFromUrl(ref.url))),
      )
      return details
        .map((group: any) => ({
          name: group.name,
          label: humanize(group.name),
          order: Number(group.order ?? 0),
        }))
        .sort((a, b) => a.order - b.order)
    })().catch((error) => {
      versionGroupsPromise = null
      throw error
    })
  }
  return versionGroupsPromise
}

export async function getDexIndex(): Promise<DexIndex> {
  if (!dexIndexPromise) {
    dexIndexPromise = (async () => {
      const [speciesList, generationList, typeMetas] = await Promise.all([
        apiGet('pokemon-species/?limit=100000'),
        apiGet('generation/?limit=100000'),
        getTypeMetas(),
      ])

      const typeLabel = new Map(typeMetas.map((type) => [type.name, type.label]))
      const generationDetails = await Promise.all(
        (generationList.results as Ref[]).map((ref) => apiGet(apiPathFromUrl(ref.url))),
      )

      const generations: GenerationMeta[] = generationDetails
        .map((generation: any) => ({
          name: generation.name,
          label: englishName(generation.names, generation.name),
        }))
        .sort((a, b) => Number(a.name.match(/(\d+)$/)?.[1] ?? 0) - Number(b.name.match(/(\d+)$/)?.[1] ?? 0))

      const generationBySpecies = new Map<number, GenerationMeta>()
      for (const generation of generationDetails) {
        const meta = generations.find((entry) => entry.name === generation.name) || null
        if (!meta) continue
        for (const speciesRef of generation.pokemon_species || []) {
          generationBySpecies.set(idFromUrl(speciesRef.url), meta)
        }
      }

      const speciesRefs = (speciesList.results as NamedRef[])
        .map((ref) => ({ ...ref, id: idFromUrl(ref.url) }))
        .filter((ref) => ref.id > 0 && ref.id < 10000)

      const details = await mapLimit(speciesRefs, 48, async (ref) => {
        try {
          return await apiGet(`pokemon/${ref.id}`)
        } catch {
          return null
        }
      })

      const species: SpeciesSummary[] = speciesRefs.map((ref, index) => {
        const pokemon = details[index]
        const pokemonTypes = Array.isArray(pokemon?.types) ? [...pokemon.types] : []
        pokemonTypes.sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
        return {
          id: ref.id,
          name: ref.name,
          displayName: humanize(ref.name),
          sprite: mediaUrl(pokemon?.sprites?.front_default),
          types: pokemonTypes.map((entry: any) => ({
            name: entry.type.name,
            label: typeLabel.get(entry.type.name) || humanize(entry.type.name),
          })),
          generation: generationBySpecies.get(ref.id) || null,
        }
      }).sort((a, b) => a.id - b.id)

      return { species, types: typeMetas, generations }
    })().catch((error) => {
      dexIndexPromise = null
      throw error
    })
  }
  return dexIndexPromise
}

async function findSpeciesSummary(id: number): Promise<SpeciesSummary | null> {
  if (!id || id >= 10000) return null
  const index = await getDexIndex()
  return index.species.find((species) => species.id === id) || null
}

async function getMoveForTable(name: string): Promise<any> {
  if (!preparedMoves.has(name)) {
    const promise = (async () => {
      const [move, types] = await Promise.all([apiGet(`move/${encodeURIComponent(name)}`), getTypeMetas()])
      const typeLabel = new Map(types.map((type) => [type.name, type.label]))
      return {
        name: move.name,
        label: englishName(move.names, move.name),
        type: {
          name: move.type?.name || '',
          label: typeLabel.get(move.type?.name) || humanize(move.type?.name),
        },
        category: humanize(move.damage_class?.name || ''),
        power: move.power ?? null,
        accuracy: move.accuracy ?? null,
        pp: move.pp ?? null,
      }
    })().catch((error) => {
      preparedMoves.delete(name)
      throw error
    })
    preparedMoves.set(name, promise)
  }
  return preparedMoves.get(name)
}

function evolutionNode(node: any): any {
  return {
    name: node?.species?.name || '',
    displayName: humanize(node?.species?.name || ''),
    children: Array.isArray(node?.evolves_to) ? node.evolves_to.map(evolutionNode) : [],
  }
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

function methodSortValue(name: string): [number, string] {
  const index = METHOD_ORDER.indexOf(name)
  return [index === -1 ? METHOD_ORDER.length : index, humanize(name)]
}

export async function getPokemonPage(name: string, gameQuery?: string): Promise<any | null> {
  let species: any
  try {
    species = await apiGet(`pokemon-species/${encodeURIComponent(name)}`)
  } catch (error: any) {
    if (error?.statusCode === 404) return null
    throw error
  }

  const defaultVariety = (species.varieties || []).find((variety: any) => variety.is_default) || species.varieties?.[0]
  const pokemonPath = defaultVariety?.pokemon?.url
    ? apiPathFromUrl(defaultVariety.pokemon.url)
    : `pokemon/${species.id}`
  const pokemon = await apiGet(pokemonPath)
  const types = await getTypeMetas()
  const typeLabel = new Map(types.map((type) => [type.name, type.label]))

  const speciesEnglishName = englishName(species.names, species.name)
  const genusEntry = (species.genera || []).find((entry: any) => entry.language?.name === 'en')
  const stats = (pokemon.stats || []).map((stat: any) => ({
    label: {
      hp: 'HP',
      attack: 'Attack',
      defense: 'Defense',
      'special-attack': 'Sp. Atk',
      'special-defense': 'Sp. Def',
      speed: 'Speed',
    }[stat.stat?.name] || humanize(stat.stat?.name || ''),
    value: Number(stat.base_stat ?? 0),
  }))
  const total = stats.reduce((sum: number, stat: any) => sum + stat.value, 0)

  const abilities = [...(pokemon.abilities || [])]
    .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
    .map((entry: any) => ({
      name: entry.ability?.name || '',
      label: humanize(entry.ability?.name || ''),
      hidden: Boolean(entry.is_hidden),
    }))

  let evolution = null
  if (species.evolution_chain?.url) {
    try {
      const chain = await apiGet(apiPathFromUrl(species.evolution_chain.url))
      evolution = evolutionNode(chain.chain)
    } catch {
      evolution = evolutionNode({ species: { name: species.name }, evolves_to: [] })
    }
  } else {
    evolution = evolutionNode({ species: { name: species.name }, evolves_to: [] })
  }

  // Work out which version groups this Pokémon has learn data for.
  const availableGameNames = new Set<string>()
  for (const moveEntry of pokemon.moves || []) {
    for (const detail of moveEntry.version_group_details || []) {
      if (detail.version_group?.name) availableGameNames.add(detail.version_group.name)
    }
  }
  const allVersionGroups = await getVersionGroups()
  const games = allVersionGroups.filter((group) => availableGameNames.has(group.name))
  let selectedGame = games[games.length - 1] || null
  if (gameQuery && games.some((group) => group.name === gameQuery)) {
    selectedGame = games.find((group) => group.name === gameQuery) || selectedGame
  }

  let tables: any[] = []
  if (selectedGame) {
    const rowsByMethod = new Map<string, any[]>()
    const seen = new Set<string>()
    for (const moveEntry of pokemon.moves || []) {
      for (const detail of moveEntry.version_group_details || []) {
        if (detail.version_group?.name !== selectedGame.name) continue
        const method = detail.move_learn_method?.name || ''
        const level = Number(detail.level_learned_at ?? 0)
        const key = `${method}|${moveEntry.move.name}|${level}`
        if (seen.has(key)) continue
        seen.add(key)
        if (!rowsByMethod.has(method)) rowsByMethod.set(method, [])
        rowsByMethod.get(method)!.push({
          moveName: moveEntry.move.name,
          level,
        })
      }
    }

    const moveNames = [...new Set([...rowsByMethod.values()].flat().map((row) => row.moveName))]
    const moveDetails = await Promise.all(moveNames.map((moveName) => getMoveForTable(moveName).catch(() => null)))
    const moveByName = new Map<string, any>()
    moveNames.forEach((moveName, index) => moveByName.set(moveName, moveDetails[index]))

    const methodNames = [...rowsByMethod.keys()].sort((a, b) => {
      const [aIndex, aLabel] = methodSortValue(a)
      const [bIndex, bLabel] = methodSortValue(b)
      return aIndex - bIndex || aLabel.localeCompare(bLabel)
    })

    tables = methodNames.map((method) => {
      const rows = (rowsByMethod.get(method) || [])
        .map((row) => {
          const move = moveByName.get(row.moveName)
          if (!move) return null
          return {
            level: row.level,
            move: { name: move.name, label: move.label },
            type: move.type,
            category: move.category,
            power: move.power,
            accuracy: move.accuracy,
            pp: move.pp,
          }
        })
        .filter(Boolean)

      const label = humanize(method)
      rows.sort((a: any, b: any) => {
        if (method === 'level-up' && a.level !== b.level) return a.level - b.level
        return a.move.label.localeCompare(b.move.label)
      })

      return {
        method,
        label,
        showLevel: method === 'level-up',
        rows,
      }
    }).filter((table) => table.rows.length > 0)
  }

  const artwork = mediaUrl(pokemon.sprites?.other?.['official-artwork']?.front_default)
    || mediaUrl(pokemon.sprites?.front_default)

  return {
    found: true,
    species: {
      id: Number(species.id),
      name: species.name,
      englishName: speciesEnglishName,
      displayName: humanize(species.name),
    },
    dexNumber: `#${String(species.id).padStart(4, '0')}`,
    genus: genusEntry?.genus || '',
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    artwork,
    height: Number(pokemon.height ?? 0) / 10,
    weight: Number(pokemon.weight ?? 0) / 10,
    types: (pokemon.types || [])
      .slice()
      .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
      .map((entry: any) => ({
        name: entry.type?.name || '',
        label: typeLabel.get(entry.type?.name) || humanize(entry.type?.name),
      })),
    stats,
    total,
    abilities,
    evolution,
    moves: {
      games,
      selectedGame,
      tables,
    },
  }
}

export async function getMovePage(name: string): Promise<any | null> {
  let move: any
  try {
    move = await apiGet(`move/${encodeURIComponent(name)}`)
  } catch (error: any) {
    if (error?.statusCode === 404) return null
    throw error
  }

  const [types, index] = await Promise.all([getTypeMetas(), getDexIndex()])
  const typeLabel = new Map(types.map((type) => [type.name, type.label]))
  const effectEntry = (move.effect_entries || []).find((entry: any) => entry.language?.name === 'en')
  let effect = collapseWhitespace(effectEntry?.short_effect)
  if (!effect) effect = latestEnglishFlavor(move.flavor_text_entries)
  if (!effect) effect = '—'

  const learned = []
  for (const ref of move.learned_by_pokemon || []) {
    const id = idFromUrl(ref.url)
    const summary = index.species.find((entry) => entry.id === id)
    if (summary) learned.push({ ...summary, hidden: false })
  }
  learned.sort((a, b) => a.id - b.id)

  return {
    found: true,
    name: move.name,
    englishName: englishName(move.names, move.name),
    type: {
      name: move.type?.name || '',
      label: typeLabel.get(move.type?.name) || humanize(move.type?.name),
    },
    category: humanize(move.damage_class?.name || ''),
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    learnedBy: learned,
  }
}

export async function getAbilityPage(name: string): Promise<any | null> {
  let ability: any
  try {
    ability = await apiGet(`ability/${encodeURIComponent(name)}`)
  } catch (error: any) {
    if (error?.statusCode === 404) return null
    throw error
  }

  const index = await getDexIndex()
  const effectEntry = (ability.effect_entries || []).find((entry: any) => entry.language?.name === 'en')
  const pokemon = []
  for (const entry of ability.pokemon || []) {
    const id = idFromUrl(entry.pokemon?.url)
    const summary = index.species.find((species) => species.id === id)
    if (summary) pokemon.push({ ...summary, hidden: Boolean(entry.is_hidden) })
  }
  pokemon.sort((a, b) => a.id - b.id)

  return {
    found: true,
    name: ability.name,
    englishName: englishName(ability.names, ability.name),
    effect: collapseWhitespace(effectEntry?.short_effect) || '—',
    pokemon,
  }
}

export async function getTypesPage(): Promise<any> {
  const types = await getTypeMetas()
  return { types }
}

export async function getTypePage(name: string): Promise<any | null> {
  let type: any
  try {
    type = await apiGet(`type/${encodeURIComponent(name)}`)
  } catch (error: any) {
    if (error?.statusCode === 404) return null
    throw error
  }

  const [types, index] = await Promise.all([getTypeMetas(), getDexIndex()])
  const typeLabels = new Map(types.map((entry) => [entry.name, entry.label]))
  const relation = (refs: NamedRef[]) => (refs || []).map((ref) => ({
    name: ref.name,
    label: typeLabels.get(ref.name) || humanize(ref.name),
  }))
  const relations = type.damage_relations || {}

  const pokemon = []
  for (const entry of type.pokemon || []) {
    const id = idFromUrl(entry.pokemon?.url)
    const summary = index.species.find((species) => species.id === id)
    if (summary) pokemon.push({ ...summary, hidden: false })
  }
  pokemon.sort((a, b) => a.id - b.id)

  const moves = (type.moves || [])
    .map((ref: NamedRef) => ({ name: ref.name, label: humanize(ref.name) }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))

  return {
    found: true,
    name: type.name,
    englishName: englishName(type.names, type.name),
    damageRelations: [
      { term: 'Super effective against', types: relation(relations.double_damage_to) },
      { term: 'Not very effective against', types: relation(relations.half_damage_to) },
      { term: 'No effect against', types: relation(relations.no_damage_to) },
      { term: 'Weak to', types: relation(relations.double_damage_from) },
      { term: 'Resists', types: relation(relations.half_damage_from) },
      { term: 'Immune to', types: relation(relations.no_damage_from) },
    ],
    pokemon,
    moves,
  }
}
