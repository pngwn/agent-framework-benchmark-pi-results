import { getTypeList } from '../../utils/pokeapi'

export default defineEventHandler(async () => getTypeList())
