import {
  getSpecies,
  getTypes,
  humanize,
  makeCards,
  typeLookup,
} from '../../utils/pokedex'

const RELATIONS = [
  ['superEffective', 'Super effective against', 'double_damage_to'],
  ['notVeryEffective', 'Not very effective against', 'half_damage_to'],
  ['noEffect', 'No effect against', 'no_damage_to'],
  ['weakTo', 'Weak to', 'double_damage_from'],
  ['resists', 'Resists', 'half_damage_from'],
  ['immuneTo', 'Immune to', 'no_damage_from'],
] as const

export default defineEventHandler(async (event) => {
  const name = String(getRouterParam(event, 'name') ?? '')
  const [types, species] = await Promise.all([getTypes(), getSpecies()])
  const type = types.find((entry) => entry.name === name)
  if (!type) return { notFound: true }

  const lookup = typeLookup(types)
  const relations = RELATIONS.map(([key, label, property]) => ({
    key,
    label,
    types: (type.damageRelations[property] ?? []).map((related) => ({
      name: related.name,
      label: lookup.get(related.name)?.englishName ?? humanize(related.name),
    })),
  }))

  const pokemonIds = type.pokemon.map((entry) => {
    const match = String(entry.pokemon?.url ?? '').match(/\/(\d+)\/?$/)
    return match ? Number(match[1]) : null
  }).filter((id): id is number => id !== null)
  const cards = makeCards(pokemonIds, species)

  const moves = type.moves
    .map((move) => ({ slug: move.name, label: humanize(move.name) }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return {
    notFound: false,
    name: type.name,
    label: type.englishName,
    relations,
    pokemonCount: cards.length,
    cards,
    moveCount: moves.length,
    moves,
  }
})
