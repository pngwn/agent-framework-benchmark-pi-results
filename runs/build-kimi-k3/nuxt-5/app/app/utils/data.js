// Shared datasets, fetched over HTTP from the API and memoized per process/tab.

export function getSpeciesList() {
  return memo('species-list', async () => {
    const data = await fetchApi('/api/v2/pokemon-species/?limit=100000')
    return data.results
      .map((r) => ({ id: idFromUrl(r.url), name: r.name }))
      .sort((a, b) => a.id - b.id)
  })
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])

// The 18 types, in API order, with their full records.
export function getTypeIndex() {
  return memo('type-index', async () => {
    const list = await fetchApi('/api/v2/type/?limit=100')
    const names = list.results.filter((r) => !EXCLUDED_TYPES.has(r.name)).map((r) => r.name)
    const records = await Promise.all(names.map((n) => fetchApi(`/api/v2/type/${n}/`)))
    return { list: records, byName: Object.fromEntries(records.map((t) => [t.name, t])) }
  })
}

export function typeEnName(typeIndex, name) {
  const record = typeIndex.byName[name]
  return record ? enName(record) : humanize(name)
}

export function getGenerations() {
  return memo('generations', async () => {
    const list = await fetchApi('/api/v2/generation/?limit=100')
    const records = (await Promise.all(list.results.map((r) => fetchApi(`/api/v2/generation/${r.name}/`)))).sort(
      (a, b) => a.id - b.id,
    )
    return records.map((g) => ({
      id: g.id,
      name: g.name,
      enName: enName(g),
      species: g.pokemon_species.map((s) => s.name),
    }))
  })
}

export function getVersionGroup(name) {
  return memo(`version-group:${name}`, () => fetchApi(`/api/v2/version-group/${name}/`))
}

// Maps each pokemon reference (from type/move/ability records) to its species,
// leaving out alternate forms (whose ids are not species ids).
export function mapPokemonToSpecies(entries, speciesList) {
  const speciesById = new Map(speciesList.map((s) => [s.id, s.name]))
  const seen = new Set()
  const result = []
  for (const entry of entries) {
    const pid = idFromUrl(entry.url ?? entry.pokemon?.url)
    const sname = speciesById.get(pid)
    if (!sname || seen.has(pid)) continue
    seen.add(pid)
    result.push({ id: pid, name: sname, entry })
  }
  result.sort((a, b) => a.id - b.id)
  return result
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

// Builds the per-learn-method move tables for one version group of a Pokémon.
// `moves` is the simplified move list from the Pokémon page loader.
export async function loadMoveTables(moves, versionGroup) {
  const byMethod = new Map()
  for (const m of moves) {
    for (const d of m.details) {
      if (d.vg !== versionGroup) continue
      let mm = byMethod.get(d.method)
      if (!mm) byMethod.set(d.method, (mm = new Map()))
      const prev = mm.get(m.name)
      if (!prev || d.level < prev.level) mm.set(m.name, { name: m.name, level: d.level })
    }
  }
  const typeIndex = await getTypeIndex()
  const names = [...new Set([...byMethod.values()].flatMap((mm) => [...mm.keys()]))]
  const records = await Promise.all(names.map((n) => fetchApi(`/api/v2/move/${n}/`).catch(() => null)))
  const byName = new Map(records.filter(Boolean).map((r) => [r.name, r]))

  const tables = [...byMethod.entries()].map(([method, mm]) => {
    const rows = [...mm.values()].map((entry) => {
      const r = byName.get(entry.name)
      return {
        level: entry.level,
        moveName: entry.name,
        moveEn: r ? enName(r) : humanize(entry.name),
        type: r?.type?.name ?? '',
        typeEn: r?.type?.name ? typeEnName(typeIndex, r.type.name) : '—',
        category: r?.damage_class?.name ? humanize(r.damage_class.name) : '—',
        power: r?.power ?? null,
        accuracy: r?.accuracy ?? null,
        pp: r?.pp ?? null,
      }
    })
    rows.sort((a, b) =>
      method === 'level-up' ? a.level - b.level || a.moveEn.localeCompare(b.moveEn) : a.moveEn.localeCompare(b.moveEn),
    )
    return { method, label: humanize(method), rows }
  })

  tables.sort((a, b) => {
    const rank = (t) => {
      const i = METHOD_ORDER.indexOf(t.method)
      return i === -1 ? METHOD_ORDER.length : i
    }
    return rank(a) - rank(b) || a.label.localeCompare(b.label)
  })
  return tables
}
