export default defineEventHandler(async (event) => {
  const name = String(getRouterParam(event, 'name') ?? '').toLowerCase()
  const ab = await apiGet(`/ability/${encodeURIComponent(name)}`)
  if (!ab) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  // Group by species: a species is marked "hidden" only if every entry that
  // maps to it has the ability as a hidden ability.
  const bySpecies = new Map<number, { id: number; name: string; hidden: boolean }>()
  for (const entry of ab.pokemon ?? []) {
    if (idFromUrl(entry.pokemon.url) >= 10000) continue
    const s = await resolveSpecies(entry.pokemon)
    if (!s) continue
    const existing = bySpecies.get(s.id)
    if (existing) existing.hidden = existing.hidden && !!entry.is_hidden
    else bySpecies.set(s.id, { id: s.id, name: s.name, hidden: !!entry.is_hidden })
  }
  const pokemon = [...bySpecies.values()].sort((a, b) => a.id - b.id)

  const effect =
    (ab.effect_entries ?? []).find((e: any) => e.language?.name === 'en')?.short_effect ?? null

  return {
    name: ab.name,
    enName: enName(ab.names, ab.name),
    effect,
    pokemon,
  }
})
