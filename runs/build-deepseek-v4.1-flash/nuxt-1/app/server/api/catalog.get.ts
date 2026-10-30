import { getCatalog } from '../utils/pokeapi'

export default defineEventHandler(async () => getCatalog())
