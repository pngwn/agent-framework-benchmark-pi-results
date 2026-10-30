import { getMovePage } from '../../utils/pokeapi'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') ?? ''
  return getMovePage(name)
})
