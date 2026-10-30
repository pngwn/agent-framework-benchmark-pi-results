import { getPokemonPage } from '../../utils/pokeapi'

export default defineEventHandler(async (event) => {
  const name = decodeURIComponent(getRouterParam(event, 'name') || '')
  const game = getQuery(event).game
  return getPokemonPage(name, typeof game === 'string' ? game : undefined)
})
