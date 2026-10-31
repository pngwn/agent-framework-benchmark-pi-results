import { getTypes } from '../utils/pokeapi'

// The 18 types, in API order.
export default defineEventHandler(async (event) => {
  const types = await getTypes(event)
  return types.map((t) => ({ name: t.name, en: t.en }))
})
