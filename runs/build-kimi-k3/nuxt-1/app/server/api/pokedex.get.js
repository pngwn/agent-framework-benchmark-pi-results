import { getIndex } from '../utils/pokeapi'

// Full species index for the home page (built from live API data, cached in memory).
export default defineEventHandler(async (event) => {
  return await getIndex(event)
})
