export default defineEventHandler(async (event) => {
  const name = String(getRouterParam(event, 'name') ?? '').toLowerCase()
  const mv = await apiGet(`/move/${encodeURIComponent(name)}`)
  if (!mv) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const idx = await getIndex()

  const effect =
    (mv.effect_entries ?? []).find((e: any) => e.language?.name === 'en')?.short_effect ??
    latestEnFlavor(mv.flavor_text_entries) ??
    null

  const learnedBy = await speciesCardsForPokemonRefs(mv.learned_by_pokemon ?? [])

  const typeName = mv.type?.name
  return {
    name: mv.name,
    enName: enName(mv.names, mv.name),
    type: typeName ? { name: typeName, label: idx.typeLabels[typeName] ?? humanizeName(typeName) } : null,
    category: mv.damage_class?.name ? humanizeName(mv.damage_class.name) : null,
    power: mv.power ?? null,
    accuracy: mv.accuracy ?? null,
    pp: mv.pp ?? null,
    effect,
    learnedBy,
  }
})
