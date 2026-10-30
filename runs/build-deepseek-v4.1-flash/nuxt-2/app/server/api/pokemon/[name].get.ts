import {
  apiRequest,
  englishName,
  getSpecies,
  getTypes,
  getVersionGroups,
  humanize,
  idFromUrl,
  latestFlavorText,
  mapLimit,
  padDex,
} from '../../utils/pokedex'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const METHOD_RANK: Record<string, number> = {
  'level-up': 0,
  machine: 1,
  egg: 2,
  tutor: 3,
}

interface EvolutionNode {
  slug: string
  label: string
  children: EvolutionNode[]
}

function evolutionNode(node: any): EvolutionNode {
  return {
    slug: node?.species?.name ?? '',
    label: humanize(node?.species?.name),
    children: (node?.evolves_to ?? []).map(evolutionNode),
  }
}

function compareMoveRows(a: any, b: any, byNameOnly = false) {
  if (!byNameOnly) {
    const levelA = a.level ?? Number.POSITIVE_INFINITY
    const levelB = b.level ?? Number.POSITIVE_INFINITY
    if (levelA !== levelB) return levelA - levelB
  }
  return a.moveName.localeCompare(b.moveName)
}

export default defineEventHandler(async (event) => {
  const name = String(getRouterParam(event, 'name') ?? '')
  const query = getQuery(event)
  const speciesRecord = await apiRequest(`pokemon-species/${name}`)
  if (!speciesRecord) return { notFound: true }

  const id = speciesRecord.id
  const [pokemon, types, versionGroups] = await Promise.all([
    apiRequest(`pokemon/${id}`),
    getTypes(),
    getVersionGroups(),
  ])
  if (!pokemon) return { notFound: true }

  const typesByName = new Map(types.map((type) => [type.name, type]))
  const evolutionId = idFromUrl(speciesRecord.evolution_chain?.url)
  const evolutionRecord = evolutionId ? await apiRequest(`evolution-chain/${evolutionId}`) : null
  const evolution: EvolutionNode = evolutionRecord?.chain
    ? evolutionNode(evolutionRecord.chain)
    : { slug: speciesRecord.name, label: humanize(speciesRecord.name), children: [] }

  const displayName = englishName(speciesRecord)
  const genus = speciesRecord.genera?.find((entry: any) => entry.language?.name === 'en')?.genus ?? '—'
  const flavorText = latestFlavorText(speciesRecord.flavor_text_entries)

  const pokemonTypes = [...(pokemon.types ?? [])]
    .sort((a: any, b: any) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((entry: any) => ({
      name: entry.type?.name ?? '',
      label: typesByName.get(entry.type?.name)?.englishName ?? humanize(entry.type?.name),
    }))

  const abilities = [...(pokemon.abilities ?? [])]
    .sort((a: any, b: any) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((entry: any) => ({
      name: entry.ability?.name ?? '',
      label: humanize(entry.ability?.name),
      hidden: Boolean(entry.is_hidden),
    }))

  const stats = (pokemon.stats ?? []).map((entry: any) => ({
    label: STAT_LABELS[entry.stat?.name] ?? humanize(entry.stat?.name),
    value: Number(entry.base_stat ?? 0),
  }))
  const statsTotal = stats.reduce((sum: number, stat: any) => sum + stat.value, 0)

  const artwork = pokemon.sprites?.other?.['official-artwork']?.front_default
    || pokemon.sprites?.other?.home?.front_default
    || pokemon.sprites?.front_default
    || null

  const details: any[] = []
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      details.push({
        moveId: idFromUrl(moveEntry.move?.url),
        moveName: moveEntry.move?.name ?? '',
        level: detail.level_learned_at ?? null,
        method: detail.move_learn_method?.name ?? '',
        game: detail.version_group?.name ?? '',
      })
    }
  }

  const games = [...new Set(details.map((detail) => detail.game).filter(Boolean))]
    .map((gameName) => {
      const group = versionGroups.find((entry) => entry.name === gameName)
      return {
        name: gameName,
        label: group?.label ?? humanize(gameName),
        order: group?.order ?? 0,
      }
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))

  const requestedGame = String(query.game ?? '')
  const selectedGame = games.find((game) => game.name === requestedGame) ?? games[games.length - 1] ?? null
  const selectedDetails = details.filter((detail) => detail.game === selectedGame?.name)

  const moveIds = [...new Set(selectedDetails.map((detail) => detail.moveId).filter((value) => value !== null))]
  const moveRecords = await mapLimit(moveIds, 20, (moveId) => apiRequest(`move/${moveId}`))
  const movesById = new Map(moveIds.map((moveId, index) => [moveId, moveRecords[index]]))

  const rows = selectedDetails.map((detail) => {
    const move = movesById.get(detail.moveId) ?? null
    const type = typesByName.get(move?.type?.name)
    return {
      method: detail.method,
      level: detail.level,
      moveName: move ? englishName(move) : humanize(detail.moveName),
      moveSlug: move?.name ?? detail.moveName,
      typeName: type?.englishName ?? humanize(move?.type?.name),
      typeSlug: move?.type?.name ?? '',
      category: humanize(move?.damage_class?.name),
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    }
  })

  const grouped = new Map<string, any[]>()
  for (const row of rows) {
    const list = grouped.get(row.method) ?? []
    list.push(row)
    grouped.set(row.method, list)
  }

  const methods = [...grouped.keys()].sort((a, b) => {
    const rankA = METHOD_RANK[a] ?? 4
    const rankB = METHOD_RANK[b] ?? 4
    if (rankA !== rankB) return rankA - rankB
    return humanize(a).localeCompare(humanize(b))
  })

  const tables = methods.map((method) => {
    const methodRows = grouped.get(method) ?? []
    const hasLevel = method === 'level-up'
    methodRows.sort((a, b) => compareMoveRows(a, b, !hasLevel))
    return {
      method,
      label: humanize(method),
      hasLevel,
      rows: methodRows,
    }
  })

  return {
    notFound: false,
    id,
    dex: padDex(id),
    name: speciesRecord.name,
    label: displayName,
    genus,
    flavorText,
    artwork,
    height: Number(pokemon.height ?? 0) / 10,
    weight: Number(pokemon.weight ?? 0) / 10,
    types: pokemonTypes,
    abilities,
    stats,
    statsTotal,
    evolution,
    games,
    selectedGame: selectedGame?.name ?? null,
    latestGame: games[games.length - 1]?.name ?? null,
    tables,
  }
})
