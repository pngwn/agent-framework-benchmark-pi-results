import { humanize } from '#shared/utils/format'
import { apiGet, cardsFromPokemonRefs, englishName, getTypes, latestEnglishFlavor } from '../../utils/pokeapi'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')

  let move
  try {
    move = await apiGet(event, `/move/${encodeURIComponent(name)}`)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const types = await getTypes(event)
  const typeEn = new Map(types.map((t) => [t.name, t.en]))

  const effect =
    move.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect ??
    latestEnglishFlavor(move.flavor_text_entries) ??
    null

  const learnedBy = await cardsFromPokemonRefs(event, move.learned_by_pokemon ?? [])

  return {
    name: move.name,
    en: englishName(move.names) ?? humanize(move.name),
    type: move.type
      ? { name: move.type.name, en: typeEn.get(move.type.name) ?? humanize(move.type.name) }
      : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    learnedBy,
  }
})
