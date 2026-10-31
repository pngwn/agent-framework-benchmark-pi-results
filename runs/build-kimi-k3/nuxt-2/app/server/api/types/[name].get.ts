const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
] as const

export default defineEventHandler(async (event) => {
  const name = String(getRouterParam(event, 'name') ?? '').toLowerCase()
  const t = await apiGet(`/type/${encodeURIComponent(name)}`)
  if (!t) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const idx = await getIndex()

  const relations = RELATIONS.map(([label, key]) => ({
    label,
    types: (t.damage_relations?.[key] ?? []).map((x: any) => ({
      name: x.name,
      label: idx.typeLabels[x.name] ?? humanizeName(x.name),
    })),
  }))

  const pokemon = await speciesCardsForPokemonRefs((t.pokemon ?? []).map((p: any) => p.pokemon))

  const moves = (t.moves ?? [])
    .map((m: any) => ({ name: m.name, label: humanizeName(m.name) }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))

  return {
    name: t.name,
    enName: enName(t.names, t.name),
    relations,
    pokemon,
    moves,
  }
})
