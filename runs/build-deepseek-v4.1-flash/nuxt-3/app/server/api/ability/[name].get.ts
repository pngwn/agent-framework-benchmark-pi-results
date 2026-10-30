import { getAbilityPageData } from '../../utils/pokeapi'

export default defineEventHandler(async (event) => {
  const name = decodeURIComponent(getRouterParam(event, 'name') || '')
  return await getAbilityPageData(name)
})
