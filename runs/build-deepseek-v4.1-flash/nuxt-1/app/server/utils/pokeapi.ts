/* Server-side access to the local PokeAPI service. Every value used by the app is
   fetched over HTTP at request time and then cached in memory for the lifetime of
   the server process. */

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])
const responseCache = new Map<string, Promise<any>>()

let speciesIndexPromise: Promise<SpeciesRef[]> | undefined
let typeIndexPromise: Promise<NamedRef[]> | undefined
let generationIndexPromise: Promise<NamedRef[]> | undefined
let catalogPromise: Promise<Catalog> | undefined

interface NamedRef {
  name: string
  url: string
}

interface SpeciesRef {
  id: number
  name: string
}

interface CatalogType {
  name: string
  label: string
}

interface CatalogPokemon {
  id: number
  name: string
  nameLabel: string
  types: CatalogType[]
  generation: string | null
  sprite: string
}

interface Catalog {
  pokemon: CatalogPokemon[]
  types: CatalogType[]
  generations: Array<{ name: string; label: string; order: number }>
}

function apiBaseUrl() {
  const config = useRuntimeConfig()
  return String(process.env.API_BASE_URL || config.apiBaseUrl || 'http://localhost:9000').replace(/\/$/, '')
}

export function humanize(name: string | undefined | null) {
  if (!name) return ''
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function generationLabel(name: string) {
  const match = String(name).match(/^generation-(.+)$/i)
  return match ? `Generation ${match[1].toUpperCase()}` : humanize(name)
}

function idFromUrl(url: string | undefined | null) {
  const match = String(url || '').match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : 0
}

function englishEntry(entries: any[] | undefined, language = 'en') {
  return (entries || []).find((entry) => entry?.language?.name === language)
}

function englishName(resource: any, fallback?: string) {
  return englishEntry(resource?.names)?.name || humanize(fallback || resource?.name || '')
}

function latestEnglishFlavor(entries: any[] | undefined) {
  const english = (entries || []).filter((entry) => entry?.language?.name === 'en')
  return english.length ? String(english[english.length - 1].flavor_text || '').replace(/\s+/g, ' ').trim() : ''
}

export function apiFetch(pathOrUrl: string): Promise<any> {
  const url = /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${apiBaseUrl()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
  let promise = responseCache.get(url)
  if (!promise) {
    promise = fetch(url).then(async (response) => {
      if (!response.ok) {
        const error: any = new Error(`PokeAPI request failed (${response.status}): ${url}`)
        error.statusCode = response.status
        throw error
      }
      return response.json()
    })
    responseCache.set(url, promise)
    promise.catch(() => responseCache.delete(url))
  }
  return promise
}

async function maybeFetch(pathOrUrl: string | undefined | null) {
  if (!pathOrUrl) return null
  try {
    return await apiFetch(pathOrUrl)
  } catch (error: any) {
    if (error?.statusCode === 404) return null
    throw error
  }
}

function resourcePath(resource: string, key: string | number) {
  return `/api/v2/${resource}/${encodeURIComponent(String(key))}/`
}

async function getResource(resource: string, key: string | number) {
  return maybeFetch(resourcePath(resource, key))
}

function getSpeciesIndex() {
  if (!speciesIndexPromise) {
    speciesIndexPromise = apiFetch('/api/v2/pokemon-species/?limit=100000')
      .then((data: any) =>
        (data.results || [])
          .map((entry: NamedRef) => ({ id: idFromUrl(entry.url), name: entry.name }))
          .filter((entry: SpeciesRef) => entry.id > 0 && entry.id < 10000)
          .sort((a: SpeciesRef, b: SpeciesRef) => a.id - b.id),
      )
      .catch((error) => {
        speciesIndexPromise = undefined
        throw error
      })
  }
  return speciesIndexPromise
}

function getTypeIndex() {
  if (!typeIndexPromise) {
    typeIndexPromise = apiFetch('/api/v2/type/?limit=100000')
      .then((data: any) => (data.results || []).filter((entry: NamedRef) => !EXCLUDED_TYPES.has(entry.name)))
      .catch((error) => {
        typeIndexPromise = undefined
        throw error
      })
  }
  return typeIndexPromise
}

function getGenerationIndex() {
  if (!generationIndexPromise) {
    generationIndexPromise = apiFetch('/api/v2/generation/?limit=100000')
      .then((data: any) => data.results || [])
      .catch((error) => {
        generationIndexPromise = undefined
        throw error
      })
  }
  return generationIndexPromise
}

function makeCard(species: SpeciesRef) {
  return {
    id: species.id,
    name: species.name,
    nameLabel: humanize(species.name),
    sprite: `${apiBaseUrl()}/media/sprites/pokemon/${species.id}.png`,
  }
}

async function cardListFromRefs(refs: any[] | undefined, extraFor?: (ref: any) => Record<string, any>) {
  const [index] = await Promise.all([getSpeciesIndex()])
  const byId = new Map(index.map((species) => [species.id, species]))
  const seen = new Set<number>()
  const cards: any[] = []
  for (const ref of refs || []) {
    const id = idFromUrl(ref?.url || ref?.pokemon?.url)
    if (!id || id >= 10000 || seen.has(id)) continue
    const species = byId.get(id)
    if (!species) continue
    seen.add(id)
    cards.push({ ...makeCard(species), ...(extraFor ? extraFor(ref) : {}) })
  }
  cards.sort((a, b) => a.id - b.id)
  return cards
}

async function buildCatalog(): Promise<Catalog> {
  const [species, typeIndex, generationIndex] = await Promise.all([
    getSpeciesIndex(),
    getTypeIndex(),
    getGenerationIndex(),
  ])

  const [typeRecords, generationRecords] = await Promise.all([
    Promise.all(typeIndex.map((entry) => getResource('type', entry.name))),
    Promise.all(generationIndex.map((entry) => getResource('generation', entry.name))),
  ])

  const typeLabels = new Map<string, string>()
  const typeByPokemon = new Map<number, Array<CatalogType & { slot: number }>>()
  for (let i = 0; i < typeIndex.length; i += 1) {
    const record = typeRecords[i]
    const name = typeIndex[i].name
    if (!record) continue
    const label = englishName(record, name)
    typeLabels.set(name, label)
    for (const item of record.pokemon || []) {
      const id = idFromUrl(item?.pokemon?.url)
      if (!id || id >= 10000) continue
      const list = typeByPokemon.get(id) || []
      list.push({ name, label, slot: Number(item.slot ?? 0) })
      typeByPokemon.set(id, list)
    }
  }
  for (const list of typeByPokemon.values()) list.sort((a, b) => a.slot - b.slot || a.name.localeCompare(b.name))

  const generationBySpecies = new Map<number, string>()
  for (let i = 0; i < generationIndex.length; i += 1) {
    const record = generationRecords[i]
    if (!record) continue
    for (const entry of record.pokemon_species || []) {
      const id = idFromUrl(entry.url)
      if (id && id < 10000) generationBySpecies.set(id, record.name)
    }
  }

  const types = typeIndex.map((entry) => ({ name: entry.name, label: typeLabels.get(entry.name) || humanize(entry.name) }))
  const generations = generationIndex.map((entry, index) => ({
    name: entry.name,
    label: generationLabel(entry.name),
    order: index + 1,
  }))

  const pokemon = species.map((entry) => ({
    id: entry.id,
    name: entry.name,
    nameLabel: humanize(entry.name),
    types: (typeByPokemon.get(entry.id) || []).map((type) => ({ name: type.name, label: type.label })),
    generation: generationBySpecies.get(entry.id) || null,
    sprite: `${apiBaseUrl()}/media/sprites/pokemon/${entry.id}.png`,
  }))

  return { pokemon, types, generations }
}

export function getCatalog(): Promise<Catalog> {
  if (!catalogPromise) {
    catalogPromise = buildCatalog().catch((error) => {
      catalogPromise = undefined
      throw error
    })
  }
  return catalogPromise
}

function buildEvolutionNode(node: any): any {
  return {
    name: node?.species?.name || '',
    label: humanize(node?.species?.name),
    children: (node?.evolves_to || []).map(buildEvolutionNode),
  }
}

function statLabel(name: string) {
  return (
    {
      hp: 'HP',
      attack: 'Attack',
      defense: 'Defense',
      'special-attack': 'Sp. Atk',
      'special-defense': 'Sp. Def',
      speed: 'Speed',
    } as Record<string, string>
  )[name] || humanize(name)
}

async function getMoveRecord(name: string) {
  return getResource('move', name)
}

function moveType(record: any) {
  return { name: record?.type?.name || '', label: humanize(record?.type?.name) }
}

function moveCategory(record: any) {
  return { name: record?.damage_class?.name || '', label: humanize(record?.damage_class?.name) }
}

export async function getPokemonPage(name: string, requestedGame?: string) {
  const species = await getResource('pokemon-species', name)
  if (!species) return { found: false as const }

  const defaultVariety =
    (species.varieties || []).find((variety: any) => variety.is_default)?.pokemon ||
    (species.varieties || [])[0]?.pokemon

  const [pokemon, evolutionChain] = await Promise.all([
    defaultVariety ? maybeFetch(defaultVariety.url) : null,
    species.evolution_chain?.url ? maybeFetch(species.evolution_chain.url) : null,
  ])
  if (!pokemon) return { found: false as const }

  const groupNames = new Set<string>()
  for (const move of pokemon.moves || []) {
    for (const detail of move.version_group_details || []) {
      if (detail?.version_group?.name) groupNames.add(detail.version_group.name)
    }
  }
  const groupRecords = await Promise.all([...groupNames].map((group) => getResource('version-group', group)))
  const versionByGroup = new Map<string, any>()
  for (let i = 0; i < groupRecords.length; i += 1) {
    versionByGroup.set([...groupNames][i], groupRecords[i])
  }
  const versions = [...groupNames]
    .map((group) => ({
      name: group,
      label: humanize(group),
      order: Number(versionByGroup.get(group)?.order ?? 0),
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))

  const defaultGame = versions.length ? versions[versions.length - 1].name : undefined
  const selectedGame = requestedGame && versions.some((version) => version.name === requestedGame) ? requestedGame : defaultGame

  const moveEntries: Array<{ moveName: string; method: string; level: number }> = []
  if (selectedGame) {
    for (const move of pokemon.moves || []) {
      for (const detail of move.version_group_details || []) {
        if (detail?.version_group?.name === selectedGame) {
          moveEntries.push({
            moveName: move.move.name,
            method: detail.move_learn_method?.name || 'other',
            level: Number(detail.level_learned_at ?? 0),
          })
        }
      }
    }
  }

  const uniqueMoveNames = [...new Set(moveEntries.map((entry) => entry.moveName))]
  const moveRecords = await Promise.all(uniqueMoveNames.map((moveName) => getMoveRecord(moveName)))
  const moveByName = new Map<string, any>()
  for (let i = 0; i < uniqueMoveNames.length; i += 1) moveByName.set(uniqueMoveNames[i], moveRecords[i])

  const methods = new Map<string, any>()
  const seenRows = new Set<string>()
  for (const entry of moveEntries) {
    const record = moveByName.get(entry.moveName)
    if (!record) continue
    const rowKey = `${entry.method}|${entry.moveName}|${entry.level}`
    if (seenRows.has(rowKey)) continue
    seenRows.add(rowKey)
    if (!methods.has(entry.method)) {
      methods.set(entry.method, { name: entry.method, label: humanize(entry.method), rows: [] })
    }
    methods.get(entry.method).rows.push({
      name: record.name,
      label: englishName(record, record.name),
      type: moveType(record),
      category: moveCategory(record),
      power: record.power,
      accuracy: record.accuracy,
      pp: record.pp,
      level: entry.level,
    })
  }

  for (const method of methods.values()) {
    if (method.name === 'level-up') {
      method.rows.sort((a: any, b: any) => a.level - b.level || a.label.localeCompare(b.label))
    } else {
      method.rows.sort((a: any, b: any) => a.label.localeCompare(b.label))
    }
  }

  const methodOrder = ['level-up', 'machine', 'egg', 'tutor']
  const moveMethods = [...methods.values()].sort((a, b) => {
    const aIndex = methodOrder.indexOf(a.name)
    const bIndex = methodOrder.indexOf(b.name)
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? methodOrder.length : aIndex) - (bIndex === -1 ? methodOrder.length : bIndex)
    }
    return a.label.localeCompare(b.label)
  })

  const stats = (pokemon.stats || []).map((entry: any) => ({
    label: statLabel(entry.stat.name),
    value: Number(entry.base_stat ?? 0),
  }))

  const abilities = (pokemon.abilities || [])
    .slice()
    .sort((a: any, b: any) => Number(a.slot ?? 0) - Number(b.slot ?? 0))
    .map((entry: any) => ({
      name: entry.ability.name,
      label: humanize(entry.ability.name),
      hidden: Boolean(entry.is_hidden),
    }))

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ||
    pokemon.sprites?.front_default ||
    `${apiBaseUrl()}/media/sprites/pokemon/${species.id}.png`

  return {
    found: true as const,
    id: Number(species.id),
    name: species.name,
    englishName: englishName(species, species.name),
    dexNumber: `#${String(species.id).padStart(4, '0')}`,
    genus: englishEntry(species.genera)?.genus || '',
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    types: (pokemon.types || [])
      .slice()
      .sort((a: any, b: any) => Number(a.slot ?? 0) - Number(b.slot ?? 0))
      .map((entry: any) => ({ name: entry.type.name, label: humanize(entry.type.name) })),
    height: `${(Number(pokemon.height ?? 0) / 10).toFixed(1)} m`,
    weight: `${(Number(pokemon.weight ?? 0) / 10).toFixed(1)} kg`,
    artwork,
    stats,
    abilities,
    evolution: evolutionChain?.chain
      ? buildEvolutionNode(evolutionChain.chain)
      : { name: species.name, label: humanize(species.name), children: [] },
    versions,
    selectedGame,
    moveMethods,
  }
}

export async function getMovePage(name: string) {
  const move = await getResource('move', name)
  if (!move) return { found: false as const }

  const effectEntry = englishEntry(move.effect_entries)
  const effect = effectEntry?.short_effect || latestEnglishFlavor(move.flavor_text_entries) || '—'
  const learned = await cardListFromRefs(move.learned_by_pokemon)

  return {
    found: true as const,
    name: move.name,
    englishName: englishName(move, move.name),
    type: moveType(move),
    category: moveCategory(move),
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect,
    learned,
  }
}

export async function getAbilityPage(name: string) {
  const ability = await getResource('ability', name)
  if (!ability) return { found: false as const }

  const effect = englishEntry(ability.effect_entries)?.short_effect || '—'
  const pokemon = await cardListFromRefs(ability.pokemon, (entry) => ({
    hidden: Boolean(entry?.is_hidden),
  }))

  return {
    found: true as const,
    name: ability.name,
    englishName: englishName(ability, ability.name),
    effect,
    pokemon,
  }
}

export async function getTypeList() {
  const index = await getTypeIndex()
  return index.map((entry) => ({ name: entry.name, label: humanize(entry.name) }))
}

export async function getTypePage(name: string) {
  const type = await getResource('type', name)
  if (!type) return { found: false as const }

  const relationKeys = [
    ['Super effective against', 'double_damage_to'],
    ['Not very effective against', 'half_damage_to'],
    ['No effect against', 'no_damage_to'],
    ['Weak to', 'double_damage_from'],
    ['Resists', 'half_damage_from'],
    ['Immune to', 'no_damage_from'],
  ] as const

  const relations = relationKeys.map(([term, key]) => ({
    term,
    types: (type.damage_relations?.[key] || []).map((entry: NamedRef) => ({
      name: entry.name,
      label: humanize(entry.name),
    })),
  }))

  const pokemon = await cardListFromRefs(type.pokemon, (entry) => ({ slot: entry?.slot }))
  const moves = (type.moves || [])
    .map((entry: NamedRef) => ({ name: entry.name, label: humanize(entry.name) }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))

  return {
    found: true as const,
    name: type.name,
    englishName: englishName(type, type.name),
    relations,
    pokemon,
    moves,
  }
}
