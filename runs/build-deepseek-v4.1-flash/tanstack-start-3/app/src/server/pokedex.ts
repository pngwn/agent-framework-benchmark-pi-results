import { createServerFn } from '@tanstack/react-start'

type Ref = { name: string; url: string }
type AnyRecord = Record<string, any>

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])
const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const jsonCache = new Map<string, Promise<AnyRecord | null>>()

function apiBase() {
  return (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '')
}

function humanize(name: string | null | undefined) {
  if (!name) return ''
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

function idFromUrl(url: string | null | undefined): number | null {
  if (!url) return null
  const match = url.match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : null
}

function withTrailingSlash(path: string) {
  return path.endsWith('/') ? path : `${path}/`
}

function apiUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  if (pathOrUrl.startsWith('/api/v2/')) return `${apiBase()}${pathOrUrl}`
  return `${apiBase()}/api/v2/${pathOrUrl.replace(/^\/+/, '')}`
}

async function getJson(pathOrUrl: string): Promise<AnyRecord | null> {
  const rawUrl = apiUrl(pathOrUrl)
  const url = rawUrl.includes('?') ? rawUrl : withTrailingSlash(rawUrl)
  let promise = jsonCache.get(url)
  if (!promise) {
    promise = (async () => {
      const response = await fetch(url)
      if (response.status === 404) return null
      if (!response.ok) {
        throw new Error(`API request failed (${response.status}): ${url}`)
      }
      return response.json()
    })()
    jsonCache.set(url, promise)
    promise.catch(() => jsonCache.delete(url))
  }
  return promise
}

async function getList(resource: string): Promise<Ref[]> {
  const data = await getJson(`/api/v2/${resource}/?limit=100000`)
  return Array.isArray(data?.results) ? data.results : []
}

function englishName(record: AnyRecord | null | undefined, fallbackName?: string) {
  const found = record?.names?.find((entry: AnyRecord) => entry.language?.name === 'en')
  return found?.name || humanize(record?.name || fallbackName)
}

function englishGenus(record: AnyRecord | null | undefined) {
  const found = record?.genera?.find((entry: AnyRecord) => entry.language?.name === 'en')
  return found?.genus || '—'
}

function collapse(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function latestEnglishFlavor(record: AnyRecord | null | undefined) {
  const entries = record?.flavor_text_entries
  if (!Array.isArray(entries)) return ''
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i]
    if (entry.language?.name === 'en') return collapse(entry.flavor_text)
  }
  return ''
}

function englishShortEffect(record: AnyRecord | null | undefined) {
  const entry = record?.effect_entries?.find(
    (candidate: AnyRecord) => candidate.language?.name === 'en',
  )
  return collapse(entry?.short_effect)
}

function mediaUrl(url: string | null | undefined) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${apiBase()}${url.startsWith('/') ? url : `/${url}`}`
}

function spriteUrl(id: number) {
  return `${apiBase()}/media/sprites/pokemon/${id}.png`
}

let speciesIndexPromise: Promise<Array<{ id: number; name: string }>> | null = null
async function getSpeciesIndex() {
  if (!speciesIndexPromise) {
    speciesIndexPromise = getList('pokemon-species').then((results) =>
      results
        .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name }))
        .filter((entry): entry is { id: number; name: string } => entry.id !== null && entry.id <= 10000)
        .sort((a, b) => a.id - b.id),
    )
    speciesIndexPromise.catch(() => {
      speciesIndexPromise = null
    })
  }
  return speciesIndexPromise
}

let pokemonIndexPromise: Promise<Array<{ id: number; name: string }>> | null = null
async function getPokemonIndex() {
  if (!pokemonIndexPromise) {
    pokemonIndexPromise = getList('pokemon').then((results) =>
      results
        .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name }))
        .filter((entry): entry is { id: number; name: string } => entry.id !== null),
    )
    pokemonIndexPromise.catch(() => {
      pokemonIndexPromise = null
    })
  }
  return pokemonIndexPromise
}

let typeCatalogPromise: Promise<Array<{ name: string; label: string; record: AnyRecord }>> | null = null
async function getTypeCatalog() {
  if (!typeCatalogPromise) {
    typeCatalogPromise = getList('type').then(async (results) => {
      const supported = results.filter((entry) => !EXCLUDED_TYPES.has(entry.name))
      const records = await Promise.all(supported.map((entry) => getJson(entry.url)))
      return supported.map((entry, index) => ({
        name: entry.name,
        label: englishName(records[index], entry.name),
        record: records[index] as AnyRecord,
      }))
    })
    typeCatalogPromise.catch(() => {
      typeCatalogPromise = null
    })
  }
  return typeCatalogPromise
}

let generationCatalogPromise:
  | Promise<Array<{ name: string; label: string; order: number; record: AnyRecord }>>
  | null = null
async function getGenerationCatalog() {
  if (!generationCatalogPromise) {
    generationCatalogPromise = getList('generation').then(async (results) => {
      const records = await Promise.all(results.map((entry) => getJson(entry.url)))
      return results
        .map((entry, index) => ({
          name: entry.name,
          label: englishName(records[index], entry.name),
          order: Number(records[index]?.order ?? idFromUrl(entry.url) ?? 0),
          record: records[index] as AnyRecord,
        }))
        .sort((a, b) => a.order - b.order)
    })
    generationCatalogPromise.catch(() => {
      generationCatalogPromise = null
    })
  }
  return generationCatalogPromise
}

let versionGroupCatalogPromise:
  | Promise<Array<{ name: string; label: string; order: number }>>
  | null = null
async function getVersionGroupCatalog() {
  if (!versionGroupCatalogPromise) {
    versionGroupCatalogPromise = getList('version-group').then(async (results) => {
      const records = await Promise.all(results.map((entry) => getJson(entry.url)))
      return results
        .map((entry, index) => ({
          name: entry.name,
          label: humanize(entry.name),
          order: Number(records[index]?.order ?? idFromUrl(entry.url) ?? 0),
        }))
        .sort((a, b) => a.order - b.order)
    })
    versionGroupCatalogPromise.catch(() => {
      versionGroupCatalogPromise = null
    })
  }
  return versionGroupCatalogPromise
}

function cardFor(
  speciesById: Map<number, { id: number; name: string }>,
  id: number,
  hidden = false,
) {
  const species = speciesById.get(id)
  if (!species) return null
  return {
    id,
    name: species.name,
    label: humanize(species.name),
    sprite: spriteUrl(id),
    hidden,
  }
}

async function cardsFromPokemonRefs(
  refs: Array<{ url?: string; is_hidden?: boolean }>,
) {
  const species = await getSpeciesIndex()
  const speciesById = new Map(species.map((entry) => [entry.id, entry]))
  const cards = new Map<number, ReturnType<typeof cardFor>>()
  for (const ref of refs) {
    const id = idFromUrl(ref.url)
    if (id === null || id > 10000) continue
    const existing = cards.get(id)
    const hidden = Boolean(ref.is_hidden)
    if (existing) {
      existing.hidden = existing.hidden || hidden
      continue
    }
    const card = cardFor(speciesById, id, hidden)
    if (card) cards.set(id, card)
  }
  return [...cards.values()]
    .filter((card): card is NonNullable<typeof card> => Boolean(card))
    .sort((a, b) => a.id - b.id)
}

function typeLabel(name: string | null | undefined) {
  return humanize(name) || '—'
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' ? value : null
}

export const getHomeData = createServerFn({ method: 'GET' }).handler(async () => {
  const [species, pokemon, types, generations] = await Promise.all([
    getSpeciesIndex(),
    getPokemonIndex(),
    getTypeCatalog(),
    getGenerationCatalog(),
  ])

  const generationBySpecies = new Map<string, string>()
  for (const generation of generations) {
    for (const ref of generation.record?.pokemon_species ?? []) {
      if (ref?.name) generationBySpecies.set(ref.name, generation.name)
    }
  }

  const pokemonNameById = new Map<number, string>()
  for (const entry of pokemon) pokemonNameById.set(entry.id, entry.name)

  const typesByPokemon = new Map<string, Array<{ name: string; label: string; slot: number }>>()
  for (const type of types) {
    for (const entry of type.record?.pokemon ?? []) {
      const name = entry.pokemon?.name
      if (!name) continue
      const list = typesByPokemon.get(name) ?? []
      if (!list.some((item) => item.name === type.name)) {
        list.push({ name: type.name, label: type.label, slot: Number(refSlot(entry)) })
      }
      typesByPokemon.set(name, list)
    }
  }
  for (const list of typesByPokemon.values()) {
    list.sort((a, b) => a.slot - b.slot || a.name.localeCompare(b.name))
  }

  const rows = species.map((entry) => {
    const defaultPokemonName = pokemonNameById.get(entry.id) || entry.name
    return {
      id: entry.id,
      name: entry.name,
      label: humanize(entry.name),
      sprite: spriteUrl(entry.id),
      generation: generationBySpecies.get(entry.name) || null,
      types: typesByPokemon.get(defaultPokemonName) ?? [],
    }
  })

  return {
    rows,
    types: types.map((type) => ({ name: type.name, label: type.label })),
    generations: generations.map((generation) => ({
      name: generation.name,
      label: generation.label,
    })),
  }
})

function slot(value: any) {
  return typeof value === 'number' ? value : 0
}

function refSlot(entry: AnyRecord) {
  return slot(entry?.slot)
}

export const getPokemonPage = createServerFn({ method: 'GET' })
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    const species = await getJson(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`)
    if (!species) return null

    const defaultVariety =
      species.varieties?.find((variety: AnyRecord) => variety.is_default)?.pokemon ||
      species.varieties?.[0]?.pokemon
    const pokemon = defaultVariety
      ? await getJson(defaultVariety.url)
      : await getJson(`/api/v2/pokemon/${species.id}/`)
    if (!pokemon) return null

    let evolutionChain: AnyRecord | null = null
    if (species.evolution_chain?.url) {
      const chain = await getJson(species.evolution_chain.url)
      evolutionChain = chain?.chain ?? null
    }

    const mapEvolution = (node: AnyRecord): {
      name: string
      label: string
      children: Array<{ name: string; label: string; children: any[] }>
    } | null => {
      if (!node?.species?.name) return null
      return {
        name: node.species.name,
        label: humanize(node.species.name),
        children: (node.evolves_to ?? [])
          .map((child: AnyRecord) => mapEvolution(child))
          .filter(Boolean) as Array<{ name: string; label: string; children: any[] }>,
      }
    }

    const evolution = (evolutionChain ? mapEvolution(evolutionChain) : null) || {
      name: species.name,
      label: humanize(species.name),
      children: [],
    }

    const stats = (pokemon.stats ?? []).map((entry: AnyRecord) => ({
      name: entry.stat?.name || '',
      label: STAT_LABELS[entry.stat?.name] || humanize(entry.stat?.name),
      value: Number(entry.base_stat ?? 0),
    }))
    const total = stats.reduce((sum: number, stat: AnyRecord) => sum + stat.value, 0)

    const abilities = (pokemon.abilities ?? [])
      .slice()
      .sort((a: AnyRecord, b: AnyRecord) => Number(a.slot ?? 0) - Number(b.slot ?? 0))
      .map((entry: AnyRecord) => ({
        name: entry.ability?.name || '',
        label: humanize(entry.ability?.name),
        hidden: Boolean(entry.is_hidden),
      }))

    const types = (pokemon.types ?? [])
      .slice()
      .sort((a: AnyRecord, b: AnyRecord) => Number(a.slot ?? 0) - Number(b.slot ?? 0))
      .map((entry: AnyRecord) => ({
        name: entry.type?.name || '',
        label: typeLabel(entry.type?.name),
      }))

    const usedGroups = new Set<string>()
    const moveEntries: Array<{ game: string; move: string; method: string; level: number }> = []
    for (const move of pokemon.moves ?? []) {
      const moveName = move.move?.name
      if (!moveName) continue
      for (const detail of move.version_group_details ?? []) {
        const game = detail.version_group?.name
        const method = detail.move_learn_method?.name
        if (!game || !method) continue
        usedGroups.add(game)
        moveEntries.push({
          game,
          move: moveName,
          method,
          level: Number(detail.level_learned_at ?? 0),
        })
      }
    }

    const versionGroups = (await getVersionGroupCatalog()).filter((group) =>
      usedGroups.has(group.name),
    )
    const gameOrder = new Map(versionGroups.map((group, index) => [group.name, index]))
    moveEntries.sort(
      (a, b) =>
        (gameOrder.get(a.game) ?? 0) - (gameOrder.get(b.game) ?? 0) ||
        a.move.localeCompare(b.move) ||
        a.method.localeCompare(b.method) ||
        a.level - b.level,
    )

    const uniqueMoveNames = [...new Set(moveEntries.map((entry) => entry.move))]
    const moveRecords = await Promise.all(
      uniqueMoveNames.map((moveName) => getJson(`/api/v2/move/${encodeURIComponent(moveName)}/`)),
    )
    const moveDetails: Record<string, AnyRecord> = {}
    uniqueMoveNames.forEach((moveName, index) => {
      const record = moveRecords[index]
      if (!record) return
      moveDetails[moveName] = {
        name: moveName,
        label: englishName(record, moveName),
        typeName: record.type?.name || '',
        typeLabel: typeLabel(record.type?.name),
        category: humanize(record.damage_class?.name) || '—',
        power: numberOrNull(record.power),
        accuracy: numberOrNull(record.accuracy),
        pp: numberOrNull(record.pp),
      }
    })

    const artwork =
      mediaUrl(pokemon.sprites?.other?.['official-artwork']?.front_default) ||
      mediaUrl(pokemon.sprites?.front_default) ||
      `${apiBase()}/media/sprites/pokemon/other/official-artwork/${pokemon.id}.png`

    return {
      id: Number(species.id),
      name: species.name,
      englishName: englishName(species, species.name),
      genus: englishGenus(species),
      flavor: latestEnglishFlavor(species),
      height: Number(pokemon.height ?? 0) / 10,
      weight: Number(pokemon.weight ?? 0) / 10,
      types,
      artwork,
      stats,
      total,
      abilities,
      evolution,
      moveGames: versionGroups,
      moveDetails,
      moveEntries,
      defaultGame: versionGroups.length ? versionGroups[versionGroups.length - 1].name : null,
    }
  })

export const getMovePage = createServerFn({ method: 'GET' })
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    const move = await getJson(`/api/v2/move/${encodeURIComponent(name)}/`)
    if (!move) return null

    const learned = await cardsFromPokemonRefs(move.learned_by_pokemon ?? [])
    const effect = englishShortEffect(move) || latestEnglishFlavor(move) || '—'

    return {
      name: move.name,
      englishName: englishName(move, move.name),
      typeName: move.type?.name || '',
      typeLabel: typeLabel(move.type?.name),
      category: humanize(move.damage_class?.name) || '—',
      power: numberOrNull(move.power),
      accuracy: numberOrNull(move.accuracy),
      pp: numberOrNull(move.pp),
      effect,
      learned,
    }
  })

export const getAbilityPage = createServerFn({ method: 'GET' })
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    const ability = await getJson(`/api/v2/ability/${encodeURIComponent(name)}/`)
    if (!ability) return null

    const refs = (ability.pokemon ?? []).map((entry: AnyRecord) => ({
      ...entry.pokemon,
      is_hidden: Boolean(entry.is_hidden),
    }))
    const pokemon = await cardsFromPokemonRefs(refs)

    return {
      name: ability.name,
      englishName: englishName(ability, ability.name),
      effect: englishShortEffect(ability) || '—',
      pokemon,
    }
  })

export const getTypesPage = createServerFn({ method: 'GET' }).handler(async () => {
  const types = await getTypeCatalog()
  return types.map((type) => ({ name: type.name, label: type.label }))
})

export const getTypePage = createServerFn({ method: 'GET' })
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    const record = await getJson(`/api/v2/type/${encodeURIComponent(name)}/`)
    if (!record || EXCLUDED_TYPES.has(record.name)) return null

    const relation = (key: string) =>
      (abilityRelation(record.damage_relations?.[key]) ?? []).map((ref: Ref) => ({
        name: ref.name,
        label: typeLabel(ref.name),
      }))

    const pokemon = await cardsFromPokemonRefs(
      (record.pokemon ?? []).map((entry: AnyRecord) => entry.pokemon),
    )
    const moves = (typeMoves(record.moves)).map((entry: Ref) => ({
      name: entry.name,
      label: humanize(entry.name),
    }))

    return {
      name: record.name,
      englishName: englishName(record, record.name),
      relations: {
        doubleDamageTo: typeRelationNames(record.damage_relations?.double_damage_to),
        halfDamageTo: typeRelationNames(record.damage_relations?.half_damage_to),
        noDamageTo: typeRelationNames(record.damage_relations?.no_damage_to),
        doubleDamageFrom: typeRelationNames(record.damage_relations?.double_damage_from),
        halfDamageFrom: typeRelationNames(record.damage_relations?.half_damage_from),
        noDamageFrom: typeRelationNames(record.damage_relations?.no_damage_from),
      },
      pokemon,
      moves,
      relation: {
        doubleDamageTo: relation('double_damage_to'),
        halfDamageTo: relation('half_damage_to'),
        noDamageTo: relation('no_damage_to'),
        doubleDamageFrom: relation('double_damage_from'),
        halfDamageFrom: relation('half_damage_from'),
        noDamageFrom: relation('no_damage_from'),
      },
    }
  })

function abilityRelation(value: unknown): Ref[] | null {
  return Array.isArray(value) ? (value as Ref[]) : null
}

function typeRelationNames(value: unknown): Ref[] {
  return Array.isArray(value) ? (value as Ref[]) : []
}

function typeMoves(value: unknown): Ref[] {
  if (!Array.isArray(value)) return []
  return (value as Ref[]).slice().sort((a, b) => a.name.localeCompare(b.name))
}
