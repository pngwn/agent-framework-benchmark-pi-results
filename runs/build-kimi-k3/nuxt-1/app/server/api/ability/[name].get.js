import { humanize } from '#shared/utils/format'
import { apiGet, cardsFromPokemonRefs, englishName } from '../../utils/pokeapi'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')

  let ability
  try {
    ability = await apiGet(event, `/ability/${encodeURIComponent(name)}`)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const effect =
    ability.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect ?? null

  const pokemon = await cardsFromPokemonRefs(event, ability.pokemon ?? [], (ref) => ({
    hidden: Boolean(ref.is_hidden),
  }))

  return {
    name: ability.name,
    en: englishName(ability.names) ?? humanize(ability.name),
    effect,
    pokemon,
  }
})
