import { getCatalog, publicCatalog } from '../utils/pokeapi'

export default defineEventHandler(async () => {
  return publicCatalog(await getCatalog())
})
