import { getPokemonMoves } from '../../../utils/pokeapi'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') ?? ''
  const game = getQuery(event).game
  return getPokemonMoves(name, typeof game === 'string' ? game : undefined)
})
