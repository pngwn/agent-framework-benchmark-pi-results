import { humanize } from '#shared/utils/format'
import { apiGet, cardsFromPokemonRefs, getTypes } from '../../utils/pokeapi'

const RELATION_TERMS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
]

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')

  const types = await getTypes(event)
  const type = types.find((t) => t.name === name)
  if (!type) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const typeEn = new Map(types.map((t) => [t.name, t.en]))

  const relations = RELATION_TERMS.map(([term, key]) => ({
    term,
    types: (type.relations?.[key] ?? [])
      .filter((t) => typeEn.has(t.name))
      .map((t) => ({ name: t.name, en: typeEn.get(t.name) })),
  }))

  const pokemon = await cardsFromPokemonRefs(event, type.pokemon ?? [])

  const moves = (type.moves ?? [])
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return { name: type.name, en: type.en, relations, pokemon, moves }
})
