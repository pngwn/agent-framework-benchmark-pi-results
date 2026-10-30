import { getPokedexIndex } from '../utils/pokeapi'

export default defineEventHandler(async () => {
  const index = await getPokedexIndex()
  return {
    pokemon: index.pokemon,
    types: index.types,
    generations: index.generations,
  }
})
