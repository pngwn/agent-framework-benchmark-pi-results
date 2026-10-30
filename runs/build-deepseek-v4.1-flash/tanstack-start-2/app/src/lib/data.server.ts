import {
  englishGenus,
  englishName,
  englishShortEffect,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
  normalizeWhitespace,
} from './format'

const apiBase = () => (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '')

const jsonCache = new Map<string, Promise<any>>()

function toPath(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    const url = new URL(pathOrUrl)
    return url.pathname + url.search
  }
  return pathOrUrl
}

async function getJson(pathOrUrl: string): Promise<any | null> {
  const path = toPath(pathOrUrl)
  let pending = jsonCache.get(path)
  if (!pending) {
    pending = (async () => {
      const response = await fetch(`${apiBase()}${path}`)
      if (response.status === 404) return null
      if (!response.ok) {
        throw new Error(`API request failed (${response.status}) for ${path}`)
      }
      return response.json()
    })()
    jsonCache.set(path, pending)
    pending.catch(() => jsonCache.delete(path))
  }
  return pending
}

async function getList(resource: string): Promise<Array<{ name: string; url: string }>> {
  const data = await getJson(`/api/v2/${resource}/?limit=100000&offset=0`)
  return data?.results ?? []
}

function mediaPath(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null
  if (/^https?:\/\//i.test(pathOrUrl)) {
    const url = new URL(pathOrUrl)
    return `${apiBase()}${url.pathname}${url.search}`
  }
  if (pathOrUrl.startsWith('/')) return `${apiBase()}${pathOrUrl}`
  return pathOrUrl
}

let speciesListPromise: Promise<Array<{ id: number; name: string }>> | null = null

function getSpeciesList() {
  if (!speciesListPromise) {
    speciesListPromise = (async () => {
      const list = await getList('pokemon-species')
      return list
        .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name }))
        .filter((entry): entry is { id: number; name: string } => entry.id !== null)
        .sort((a, b) => a.id - b.id)
    })()
  }
  return speciesListPromise
}

let speciesIndexPromise:
  | Promise<{ byId: Map<number, string>; byName: Map<string, number> }> 
  | null = null

function getSpeciesIndex() {
  if (!speciesIndexPromise) {
    speciesIndexPromise = getSpeciesList().then((species) => {
      const byId = new Map<number, string>()
      const byName = new Map<string, number>()
      for (const entry of species) {
        byId.set(entry.id, entry.name)
        byName.set(entry.name, entry.id)
      }
      return { byId, byName }
    })
  }
  return speciesIndexPromise
}

const typeNamesPromise: Promise<Map<string, string>> = Promise.resolve(new Map())

async function getTypeCatalog() {
  const list = await getList('type')
  const names = list
    .map((entry) => entry.name)
    .filter((name) => !['stellar', 'unknown', 'shadow'].includes(name))
  const records = await Promise.all(
    names.map((name) => getJson(`/api/v2/type/${encodeURIComponent(name)}/`)),
  )
  const types = names.map((name, index) => {
    const record = records[index]
    return {
      name,
      label: englishName(record, name),
      record,
    }
  })
  return types
}

let typeDataPromise:
  | Promise<{
      types: Array<{ name: string; label: string; record: any }>
      labels: Map<string, string>
      speciesTypes: Map<string, Array<{ slot: number; name: string; label: string }>>
    }>
  | null = null

function getTypeData() {
  if (!typeDataPromise) {
    typeDataPromise = (async () => {
      const species = await getSpeciesIndex()
      const types = await getTypeCatalog()
      const labels = new Map<string, string>()
      const speciesTypes = new Map<string, Array<{ slot: number; name: string; label: string }>>()
      for (const type of types) {
        labels.set(type.name, type.label)
        const entries = type.record?.pokemon ?? []
        for (const entry of entries) {
          const pokemon = entry.pokemon
          const pokemonId = idFromUrl(pokemon?.url)
          if (pokemonId === null || pokemonId > 10000) continue
          const speciesName = species.byId.get(pokemonId)
          if (!speciesName) continue
          const current = speciesTypes.get(speciesName) ?? []
          if (!current.some((item) => item.name === type.name)) {
            current.push({ slot: Number(entry.slot ?? current.length + 1), name: type.name, label: type.label })
            current.sort((a, b) => a.slot - b.slot)
            speciesTypes.set(speciesName, current)
          }
        }
      }
      return { types, labels, speciesTypes }
    })()
  }
  return typeDataPromise
}

let generationDataPromise:
  | Promise<{
      generations: Array<{ name: string; label: string }>
      speciesGeneration: Map<string, string>
    }>
  | null = null

function getGenerationData() {
  if (!generationDataPromise) {
    generationDataPromise = (async () => {
      const list = await getList('generation')
      const records = await Promise.all(
        list.map((entry) => getJson(`/api/v2/generation/${encodeURIComponent(entry.name)}/`)),
      )
      const rows = list.map((entry, index) => {
        const record = records[index]
        return {
          name: entry.name,
          label: englishName(record, entry.name),
          id: Number(record?.id ?? index + 1),
          species: (record?.pokemon_species ?? []).map((item: any) => item.name as string),
        }
      })
      rows.sort((a, b) => a.id - b.id)
      const speciesGeneration = new Map<string, string>()
      for (const row of rows) {
        for (const speciesName of row.species) speciesGeneration.set(speciesName, row.name)
      }
      return {
        generations: rows.map((row) => ({ name: row.name, label: row.label })),
        speciesGeneration,
      }
    })()
  }
  return generationDataPromise
}

function makeCard(speciesName: string, speciesId: number) {
  const id = speciesId
  return {
    id,
    dex: `#${String(id).padStart(4, '0')}`,
    name: speciesName,
    displayName: humanize(speciesName),
    href: `/pokemon/${speciesName}`,
    sprite: `${apiBase()}/media/sprites/pokemon/${id}.png`,
  }
}

function speciesCardsFromPokemonRefs(refs: Array<{ name: string; url: string }>, hidden = false) {
  const seen = new Set<number>()
  return refs
    .map((ref) => {
      const id = idFromUrl(ref.url)
      if (id === null || id > 10000 || seen.has(id)) return null
      seen.add(id)
      return { id, name: ref.name, hidden }
    })
    .filter((ref): ref is { id: number; name: string; hidden: boolean } => ref !== null)
}

export async function loadHomeData() {
  const [species, typeData, generationData] = await Promise.all([
    getSpeciesList(),
    getTypeData(),
    getGenerationData(),
  ])
  const cards = species.map((entry) => {
    const card = makeCard(entry.name, entry.id)
    return {
      ...card,
      types: typeData.speciesTypes.get(entry.name) ?? [],
    }
  })
  return {
    species: cards,
    types: typeData.types.map((type) => ({ name: type.name, label: type.label })),
    generations: generationData.generations,
    speciesGeneration: Object.fromEntries(generationData.speciesGeneration),
  }
}

async function getSpeciesCardsForRefs(refs: Array<{ name: string; url: string }>) {
  const species = await getSpeciesIndex()
  return speciesCardsFromPokemonRefs(refs)
    .map((ref) => {
      const speciesName = species.byId.get(ref.id)
      if (!speciesName) return null
      return { ...makeCard(speciesName, ref.id), hidden: ref.hidden }
    })
    .filter((card): card is ReturnType<typeof makeCard> & { hidden: boolean } => card !== null)
    .sort((a, b) => a.id - b.id)
}

function simplifyEvolution(node: any): any | null {
  if (!node?.species?.name) return null
  return {
    name: node.species.name as string,
    evolvesTo: (node.evolves_to ?? [])
      .map((child: any) => simplifyEvolution(child))
      .filter(Boolean),
  }
}

let versionGroupsPromise:
  | Promise<Array<{ name: string; label: string; order: number }>>
  | null = null

function getAllVersionGroups() {
  if (!versionGroupsPromise) {
    versionGroupsPromise = (async () => {
      const list = await getList('version-group')
      const records = await Promise.all(
        list.map((entry) => getJson(`/api/v2/version-group/${encodeURIComponent(entry.name)}/`)),
      )
      return list
        .map((entry, index) => ({
          name: entry.name,
          label: humanize(entry.name),
          order: Number(records[index]?.order ?? index + 1),
        }))
        .sort((a, b) => a.order - b.order)
    })()
  }
  return versionGroupsPromise
}

function statLabel(name: string): string {
  const labels: Record<string, string> = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
  }
  return labels[name] ?? humanize(name)
}

export async function loadPokemonPage(name: string, game: string | undefined) {
  const species = await getJson(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`)
  if (!species) return null

  const variety =
    (species.varieties ?? []).find((entry: any) => entry.is_default) ?? species.varieties?.[0]
  const pokemonRef = variety?.pokemon?.url ?? `/api/v2/pokemon/${species.id}/`
  const [pokemon, evolutionChain, allVersionGroups] = await Promise.all([
    getJson(pokemonRef),
    species.evolution_chain?.url ? getJson(species.evolution_chain.url) : Promise.resolve(null),
    getAllVersionGroups(),
  ])
  if (!pokemon) return null

  const groupDetails = new Map<string, any>()
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      groupDetails.set(detail.version_group.name, detail.version_group)
    }
  }
  const availableGroups = allVersionGroups.filter((group) => groupDetails.has(group.name))
  const selectedGroup =
    availableGroups.find((group) => group.name === game) ??
    availableGroups[availableGroups.length - 1] ??
    null

  const rows: Array<{
    level: number | null
    method: string
    moveName: string
    displayName: string
    typeName: string
    typeLabel: string
    category: string
    power: number | null
    accuracy: number | null
    pp: number | null
  }> = []

  if (selectedGroup) {
    const moveRefs = new Map<string, { name: string; url: string }>()
    for (const moveEntry of pokemon.moves ?? []) {
      const details = (moveEntry.version_group_details ?? []).filter(
        (detail: any) => detail.version_group.name === selectedGroup.name,
      )
      if (!details.length) continue
      moveRefs.set(moveEntry.move.name, moveEntry.move)
      for (const detail of details) {
        rows.push({
          level: detail.level_learned_at ?? null,
          method: detail.move_learn_method?.name ?? 'unknown',
          moveName: moveEntry.move.name,
          displayName: humanize(moveEntry.move.name),
          typeName: '',
          typeLabel: '',
          category: '',
          power: null,
          accuracy: null,
          pp: null,
        })
      }
    }

    const moveNames = [...moveRefs.keys()]
    const moveRecords = await Promise.all(
      moveNames.map((moveName) => getJson(`/api/v2/move/${encodeURIComponent(moveName)}/`)),
    )
    const moveData = new Map<string, any>()
    moveNames.forEach((moveName, index) => moveData.set(moveName, moveRecords[index]))

    for (const row of rows) {
      const record = moveData.get(row.moveName)
      row.displayName = englishName(record, row.moveName)
      row.typeName = record?.type?.name ?? ''
      row.typeLabel = humanize(row.typeName)
      row.category = humanize(record?.damage_class?.name)
      row.power = record?.power ?? null
      row.accuracy = record?.accuracy ?? null
      row.pp = record?.pp ?? null
    }
  }

  const stats = (pokemon.stats ?? []).map((entry: any) => ({
    name: entry.stat?.name ?? '',
    label: statLabel(entry.stat?.name ?? ''),
    value: Number(entry.base_stat ?? 0),
  }))
  const statTotal = stats.reduce((sum: number, stat: any) => sum + stat.value, 0)

  return {
    id: species.id,
    name: species.name,
    englishName: englishName(species, species.name),
    genus: englishGenus(species),
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    types: (pokemon.types ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((entry: any) => ({ name: entry.type.name, label: humanize(entry.type.name) })),
    height: Number(pokemon.height ?? 0),
    weight: Number(pokemon.weight ?? 0),
    artwork: mediaPath(
      pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default,
    ),
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((entry: any) => ({
        name: entry.ability.name,
        label: humanize(entry.ability.name),
        hidden: Boolean(entry.is_hidden),
      })),
    stats,
    statTotal,
    evolution: simplifyEvolution(evolutionChain?.chain),
    gameOptions: availableGroups.map((group) => ({ name: group.name, label: group.label })),
    selectedGame: selectedGroup?.name ?? '',
    moveRows: rows,
  }
}

export async function loadMovePage(name: string) {
  const move = await getJson(`/api/v2/move/${encodeURIComponent(name)}/`)
  if (!move) return null
  const learned = await getSpeciesCardsForRefs(move.learned_by_pokemon ?? [])
  const effect =
    englishShortEffect(move.effect_entries) ||
    latestEnglishFlavor(move.flavor_text_entries) ||
    '—'
  return {
    id: move.id,
    name: move.name,
    englishName: englishName(move, move.name),
    typeName: move.type?.name ?? '',
    typeLabel: humanize(move.type?.name),
    category: humanize(move.damage_class?.name),
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    learned,
  }
}

export async function loadAbilityPage(name: string) {
  const ability = await getJson(`/api/v2/ability/${encodeURIComponent(name)}/`)
  if (!ability) return null
  const refs = (ability.pokemon ?? []).map((entry: any) => ({
    name: entry.pokemon?.name ?? '',
    url: entry.pokemon?.url ?? '',
    hidden: Boolean(entry.is_hidden),
  }))
  const species = await getSpeciesIndex()
  const cards = refs
    .map((ref: any) => {
      const id = idFromUrl(ref.url)
      if (id === null || id > 10000) return null
      const speciesName = species.byId.get(id)
      if (!speciesName) return null
      return { ...makeCard(speciesName, id), hidden: ref.hidden }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.id - b.id)
  return {
    id: ability.id,
    name: ability.name,
    englishName: englishName(ability, ability.name),
    effect: englishShortEffect(ability.effect_entries) || '—',
    pokemon: cards,
  }
}

export async function loadTypeList() {
  const typeData = await getTypeData()
  return typeData.types.map((type) => ({ name: type.name, label: type.label }))
}

export async function loadTypePage(name: string) {
  const typeData = await getTypeData()
  const type = typeData.types.find((entry) => entry.name === name)
  if (!type) return null
  const record = type.record
  const refs = (record.pokemon ?? []).map((entry: any) => ({
    name: entry.pokemon?.name ?? '',
    url: entry.pokemon?.url ?? '',
  }))
  const pokemon = await getSpeciesCardsForRefs(refs)
  const relations = record.damage_relations ?? {}
  const relationNames: Array<[string, string]> = [
    ['double_damage_to', 'Super effective against'],
    ['half_damage_to', 'Not very effective against'],
    ['no_damage_to', 'No effect against'],
    ['double_damage_from', 'Weak to'],
    ['half_damage_from', 'Resists'],
    ['no_damage_from', 'Immune to'],
  ]
  return {
    id: record.id,
    name: record.name,
    englishName: englishName(record, record.name),
    relations: relationNames.map(([key, label]) => ({
      label,
      types: (relations[key] ?? []).map((entry: any) => ({
        name: entry.name,
        label: humanize(entry.name),
      })),
    })),
    pokemon,
    moves: (record.moves ?? [])
      .map((move: any) => ({ name: move.name, label: humanize(move.name) }))
      .sort((a: any, b: any) => a.label.localeCompare(b.label)),
  }
}
