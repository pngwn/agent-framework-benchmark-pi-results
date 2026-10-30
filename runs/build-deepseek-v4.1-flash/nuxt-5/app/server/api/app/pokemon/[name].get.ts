export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') || ''
  const game = getQuery(event).game
  const data = await getPokemonPage(name, typeof game === 'string' ? game : undefined)
  if (!data) setResponseStatus(event, 404)
  return data || { found: false }
})
