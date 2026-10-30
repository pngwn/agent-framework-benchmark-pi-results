export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') || ''
  const data = await getAbilityPage(name)
  if (!data) setResponseStatus(event, 404)
  return data || { found: false }
})
