export default defineEventHandler(async () => {
  const idx = await getIndex()
  return {
    species: idx.species,
    types: idx.types,
    generations: idx.generations,
  }
})
