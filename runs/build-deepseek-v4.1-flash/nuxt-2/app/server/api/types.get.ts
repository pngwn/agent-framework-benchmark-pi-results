import { getTypes } from '../utils/pokedex'

export default defineEventHandler(async () => {
  const types = await getTypes()
  return {
    types: types.map((type) => ({ name: type.name, label: type.englishName })),
  }
})
