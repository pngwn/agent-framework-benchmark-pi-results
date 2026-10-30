export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') || ''
  const data = await getMovePage(name)
  if (!data) setResponseStatus(event, 404)
  return data || { found: false }
})
