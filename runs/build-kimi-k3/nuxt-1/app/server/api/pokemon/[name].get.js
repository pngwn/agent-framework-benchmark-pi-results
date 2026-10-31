import { humanize } from '#shared/utils/format'
import {
  apiGet,
  englishName,
  getMoveSummary,
  getTypes,
  getVersionGroupOrders,
  idFromUrl,
  latestEnglishFlavor,
  mapLimit,
  spriteUrl,
} from '../../utils/pokeapi'

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

function evolutionNode(node) {
  return { name: node.species.name, children: (node.evolves_to ?? []).map(evolutionNode) }
}

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')

  let species
  try {
    species = await apiGet(event, `/pokemon-species/${encodeURIComponent(name)}`)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const variety = species.varieties?.find((v) => v.is_default) ?? species.varieties?.[0]
  if (!variety) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const [pokemon, types, vgOrders] = await Promise.all([
    apiGet(event, `/pokemon/${idFromUrl(variety.pokemon.url)}`),
    getTypes(event),
    getVersionGroupOrders(event),
  ])
  const typeEn = new Map(types.map((t) => [t.name, t.en]))

  // Evolution chain
  let evolution = null
  if (species.evolution_chain?.url) {
    const chain = await apiGet(event, `/evolution-chain/${idFromUrl(species.evolution_chain.url)}`)
    evolution = evolutionNode(chain.chain)
  }

  // Moves grouped by version group and learn method.
  const gameNames = new Set()
  for (const m of pokemon.moves ?? []) {
    for (const v of m.version_group_details ?? []) gameNames.add(v.version_group.name)
  }
  const games = [...gameNames]
    .sort((a, b) => (vgOrders[a] ?? 9999) - (vgOrders[b] ?? 9999))
    .map((n) => ({ name: n, label: humanize(n) }))

  const summaries = await mapLimit(
    (pokemon.moves ?? []).map((m) => m.move.name),
    20,
    (n) => getMoveSummary(event, n),
  )
  const summaryByName = new Map(summaries.map((s) => [s.name, s]))

  const movesByGame = {}
  for (const m of pokemon.moves ?? []) {
    const summary = summaryByName.get(m.move.name)
    for (const v of m.version_group_details ?? []) {
      const game = v.version_group.name
      const method = v.move_learn_method.name
      const row = {
        level: v.level_learned_at,
        move: summary.name,
        label: summary.en,
        type: summary.type,
        typeLabel: summary.type ? (typeEn.get(summary.type) ?? humanize(summary.type)) : null,
        category: summary.category ? humanize(summary.category) : null,
        power: summary.power,
        accuracy: summary.accuracy,
        pp: summary.pp,
      }
      ;((movesByGame[game] ??= {})[method] ??= []).push(row)
    }
  }
  for (const byMethod of Object.values(movesByGame)) {
    for (const [method, rows] of Object.entries(byMethod)) {
      rows.sort((a, b) =>
        method === 'level-up'
          ? a.level - b.level || a.label.localeCompare(b.label)
          : a.label.localeCompare(b.label),
      )
    }
  }

  const stats = (pokemon.stats ?? []).map((s) => ({
    key: s.stat.name,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }))

  return {
    id: species.id,
    name: species.name,
    en: englishName(species.names) ?? humanize(species.name),
    genus: species.genera?.find((g) => g.language?.name === 'en')?.genus ?? null,
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    height: pokemon.height,
    weight: pokemon.weight,
    artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
    sprite: spriteUrl(event, pokemon.id),
    types: [...(pokemon.types ?? [])]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({ name: t.type.name, en: typeEn.get(t.type.name) ?? humanize(t.type.name) })),
    abilities: [...(pokemon.abilities ?? [])]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: Boolean(a.is_hidden) })),
    stats,
    total: stats.reduce((sum, s) => sum + s.value, 0),
    evolution,
    games,
    defaultGame: games.at(-1)?.name ?? null,
    movesByGame,
  }
})
