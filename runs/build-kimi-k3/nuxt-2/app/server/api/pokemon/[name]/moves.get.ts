const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

export default defineEventHandler(async (event) => {
  const name = String(getRouterParam(event, 'name') ?? '').toLowerCase()
  const game = String(getQuery(event).game ?? '')

  const species = await apiGet(`/pokemon-species/${encodeURIComponent(name)}`)
  if (!species) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const varieties = species.varieties ?? []
  const defaultVariety = varieties.find((v: any) => v.is_default) ?? varieties[0]
  if (!defaultVariety) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const pokemon = await apiGet(`/pokemon/${idFromUrl(defaultVariety.pokemon.url)}`)
  if (!pokemon) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const idx = await getIndex()

  // Group learn entries by learn method for the requested version group.
  const byMethod = new Map<string, { move: string; level: number }[]>()
  const moveNames = new Set<string>()
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) {
      if (d.version_group?.name !== game) continue
      const method = d.move_learn_method?.name
      if (!method) continue
      const arr = byMethod.get(method) ?? []
      arr.push({ move: m.move.name, level: d.level_learned_at ?? 0 })
      byMethod.set(method, arr)
      moveNames.add(m.move.name)
    }
  }

  const moveRecords = new Map<string, any>()
  await mapLimit([...moveNames], 16, async (n) => {
    moveRecords.set(n, await apiGet(`/move/${encodeURIComponent(n)}`))
  })

  const methods = [...byMethod.keys()]
    .sort((a, b) => {
      const ia = METHOD_ORDER.indexOf(a)
      const ib = METHOD_ORDER.indexOf(b)
      if (ia !== -1 || ib !== -1) return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib)
      return humanizeName(a).localeCompare(humanizeName(b))
    })
    .map((method) => {
      const rows = (byMethod.get(method) ?? []).map(({ move, level }) => {
        const rec = moveRecords.get(move)
        const typeName = rec?.type?.name
        return {
          level,
          moveName: move,
          move: enName(rec?.names, move),
          type: typeName ? { name: typeName, label: idx.typeLabels[typeName] ?? humanizeName(typeName) } : null,
          category: rec?.damage_class?.name ? humanizeName(rec.damage_class.name) : '—',
          power: rec?.power ?? null,
          accuracy: rec?.accuracy ?? null,
          pp: rec?.pp ?? null,
        }
      })
      rows.sort((a, b) =>
        method === 'level-up' ? a.level - b.level || a.move.localeCompare(b.move) : a.move.localeCompare(b.move),
      )
      return { name: method, label: humanizeName(method), hasLevel: method === 'level-up', rows }
    })

  return { game, methods }
})
