export default defineEventHandler(async () => {
  const idx = await getIndex()
  return { types: idx.types }
})
