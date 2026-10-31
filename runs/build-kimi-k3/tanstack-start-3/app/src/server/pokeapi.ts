// Server-side data access layer. All data comes from the PokeAPI-compatible
// HTTP API at API_BASE_URL at request time. Responses are cached in memory.

type Ref = { name: string; url: string }

const cache = new Map<string, Promise<any>>()

export function apiBase(): string {
  const env = (globalThis as any).process?.env?.API_BASE_URL
  return (env || 'http://localhost:9000').replace(/\/+$/, '')
}

export function apiGet(path: string): Promise<any> {
  let p = cache.get(path)
  if (!p) {
    p = fetch(`${apiBase()}/api/v2${path}`)
      .then(async (res) => {
        if (res.status === 404) return null
        if (!res.ok) throw new Error(`API request failed: ${path} (${res.status})`)
        return res.json()
      })
      .catch((err) => {
        cache.delete(path)
        throw err
      })
    cache.set(path, p)
  }
  return p
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    }),
  )
  return out
}

export function idFromUrl(url: string): number {
  const m = url.match(/\/(\d+)\/?$/)
  return m ? Number(m[1]) : NaN
}

export function humanize(name: string): string {
  return name
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function enName(record: any): string {
  return record?.names?.find((n: any) => n.language.name === 'en')?.name ?? humanize(record?.name ?? '')
}

function enGenus(record: any): string | null {
  return record?.genera?.find((g: any) => g.language.name === 'en')?.genus ?? null
}

function enShortEffect(record: any): string | null {
  return record?.effect_entries?.find((e: any) => e.language.name === 'en')?.short_effect ?? null
}

function latestEnFlavor(record: any): string | null {
  const entries = (record?.flavor_text_entries ?? []).filter((e: any) => e.language.name === 'en')
  const last = entries[entries.length - 1]
  return last ? String(last.flavor_text).replace(/\s+/g, ' ').trim() : null
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])

// ---- shared reference data -------------------------------------------------

let speciesListPromise: Promise<{ id: number; name: string }[]> | null = null
export function getSpeciesList() {
  if (!speciesListPromise) {
    speciesListPromise = apiGet('/pokemon-species/?limit=10000').then((d) =>
      (d?.results ?? []).map((r: Ref) => ({ id: idFromUrl(r.url), name: r.name })),
    )
    speciesListPromise.catch(() => (speciesListPromise = null))
  }
  return speciesListPromise
}

export async function getSpeciesById(): Promise<Map<number, string>> {
  const list = await getSpeciesList()
  return new Map(list.map((s) => [s.id, s.name]))
}

let typesPromise: Promise<{ name: string; englishName: string }[]> | null = null
export function getTypes() {
  if (!typesPromise) {
    typesPromise = (async () => {
      const list = await apiGet('/type/?limit=100')
      const refs = (list?.results ?? []).filter((r: Ref) => !EXCLUDED_TYPES.has(r.name))
      const records = await mapLimit(refs, 6, (r: Ref) => apiGet(`/type/${r.name}`))
      return records.filter(Boolean).map((t: any) => ({ name: t.name, englishName: enName(t) }))
    })()
    typesPromise.catch(() => (typesPromise = null))
  }
  return typesPromise
}

export async function getTypeEnglishNames(): Promise<Map<string, string>> {
  const types = await getTypes()
  return new Map(types.map((t) => [t.name, t.englishName]))
}

let generationsPromise: Promise<{ name: string; englishName: string; species: string[] }[]> | null = null
export function getGenerations() {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const list = await apiGet('/generation/?limit=100')
      const refs = list?.results ?? []
      const records = await mapLimit(refs, 6, (r: Ref) => apiGet(`/generation/${r.name}`))
      return records.filter(Boolean).map((g: any) => ({
        name: g.name,
        englishName: enName(g),
        species: (g.pokemon_species ?? []).map((s: Ref) => s.name),
      }))
    })()
    generationsPromise.catch(() => (generationsPromise = null))
  }
  return generationsPromise
}

let versionGroupsPromise: Promise<Map<string, number>> | null = null
export function getVersionGroupOrders(): Promise<Map<string, number>> {
  if (!versionGroupsPromise) {
    versionGroupsPromise = (async () => {
      const list = await apiGet('/version-group/?limit=100')
      const refs = list?.results ?? []
      const records = await mapLimit(refs, 6, (r: Ref) => apiGet(`/version-group/${r.name}`))
      return new Map(records.filter(Boolean).map((v: any) => [v.name, v.order] as [string, number]))
    })()
    versionGroupsPromise.catch(() => (versionGroupsPromise = null))
  }
  return versionGroupsPromise
}

// ---- cards -----------------------------------------------------------------

export type CardData = {
  id: number
  speciesName: string
  name: string
  sprite: string
  types: { name: string; englishName: string }[]
  hiddenAbility?: boolean
}

async function cardForPokemonRef(ref: Ref, typeNames: Map<string, string>): Promise<CardData | null> {
  const id = idFromUrl(ref.url)
  const speciesById = await getSpeciesById()
  const speciesName = speciesById.get(id)
  if (!speciesName) return null // alternate form or unknown Pokémon: out of scope
  return {
    id,
    speciesName,
    name: humanize(speciesName),
    sprite: `${apiBase()}/media/sprites/pokemon/${id}.png`,
    types: [],
  }
}

async function cardsForRefs(refs: Ref[]): Promise<CardData[]> {
  const typeNames = await getTypeEnglishNames()
  const cards = await mapLimit(refs, 8, (r) => cardForPokemonRef(r, typeNames))
  return cards.filter((c): c is CardData => c !== null).sort((a, b) => a.id - b.id)
}

// ---- home page -------------------------------------------------------------

export async function getHomeIndex() {
  const [species, typeRefs, generations, typeNames] = await Promise.all([
    getSpeciesList(),
    apiGet('/type/?limit=100'),
    getGenerations(),
    getTypeEnglishNames(),
  ])
  const speciesIds = new Set(species.map((s) => s.id))

  const refs = (typeRefs?.results ?? []).filter((r: Ref) => !EXCLUDED_TYPES.has(r.name))
  const typeRecords = await mapLimit(refs, 6, (r: Ref) => apiGet(`/type/${r.name}`))

  const typesBySpecies = new Map<number, string[]>()
  for (const t of typeRecords) {
    if (!t) continue
    for (const p of t.pokemon ?? []) {
      const id = idFromUrl(p.pokemon.url)
      if (!speciesIds.has(id)) continue
      const arr = typesBySpecies.get(id) ?? []
      arr[p.slot - 1] = t.name
      typesBySpecies.set(id, arr)
    }
  }

  const generationBySpecies = new Map<string, string>()
  for (const g of generations) {
    for (const s of g.species) generationBySpecies.set(s, g.name)
  }

  return {
    species: species.map((s) => ({
      id: s.id,
      name: s.name,
      displayName: humanize(s.name),
      sprite: `${apiBase()}/media/sprites/pokemon/${s.id}.png`,
      types: (typesBySpecies.get(s.id) ?? [])
        .filter(Boolean)
        .map((n) => ({ name: n, englishName: typeNames.get(n) ?? humanize(n) })),
      generation: generationBySpecies.get(s.name) ?? '',
    })),
    types: [...typeNames.entries()].map(([name, englishName]) => ({ name, englishName })),
    generations: generations.map((g) => ({ name: g.name, englishName: g.englishName })),
  }
}

// ---- pokémon page ----------------------------------------------------------

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

export type MoveRow = {
  level: number
  moveName: string
  moveEnglish: string
  typeName: string
  typeEnglish: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

export async function getPokemonPage(name: string, game?: string) {
  const species = await apiGet(`/pokemon-species/${encodeURIComponent(name.toLowerCase())}`)
  if (!species) return null

  // A species' default Pokémon has the same id as the species.
  const [pokemon, chainDoc, vgOrders, typeNames] = await Promise.all([
    apiGet(`/pokemon/${species.id}`),
    apiGet(`/evolution-chain/${idFromUrl(species.evolution_chain.url)}`),
    getVersionGroupOrders(),
    getTypeEnglishNames(),
  ])
  if (!pokemon) return null

  // Version groups in which this Pokémon learns moves, ordered.
  const vgNames = new Set<string>()
  for (const m of pokemon.moves ?? []) {
    for (const vgd of m.version_group_details ?? []) vgNames.add(vgd.version_group.name)
  }
  const games = [...vgNames]
    .map((n) => ({ name: n, order: vgOrders.get(n) ?? 0 }))
    .sort((a, b) => a.order - b.order)
  const defaultGame = games.length ? games[games.length - 1].name : ''
  const selectedGame = game && vgNames.has(game) ? game : defaultGame

  // Moves learned in the selected version group, grouped by learn method.
  type RawRow = { method: string; level: number; moveName: string }
  const rawRows: RawRow[] = []
  for (const m of pokemon.moves ?? []) {
    for (const vgd of m.version_group_details ?? []) {
      if (vgd.version_group.name !== selectedGame) continue
      rawRows.push({ method: vgd.move_learn_method.name, level: vgd.level_learned_at, moveName: m.move.name })
    }
  }
  const uniqueMoves = [...new Set(rawRows.map((r) => r.moveName))]
  const moveDocs = await mapLimit(uniqueMoves, 8, (n) => apiGet(`/move/${n}`))
  const moveByName = new Map<string, any>(uniqueMoves.map((n, i) => [n, moveDocs[i]]))

  const rowsByMethod = new Map<string, MoveRow[]>()
  for (const r of rawRows) {
    const doc = moveByName.get(r.moveName)
    if (!doc) continue
    const row: MoveRow = {
      level: r.level,
      moveName: r.moveName,
      moveEnglish: enName(doc),
      typeName: doc.type?.name ?? '',
      typeEnglish: typeNames.get(doc.type?.name) ?? humanize(doc.type?.name ?? ''),
      category: doc.damage_class?.name ? humanize(doc.damage_class.name) : '—',
      power: doc.power ?? null,
      accuracy: doc.accuracy ?? null,
      pp: doc.pp ?? null,
    }
    const arr = rowsByMethod.get(r.method) ?? []
    arr.push(row)
    rowsByMethod.set(r.method, arr)
  }

  const methods = [...rowsByMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a)
    const ib = METHOD_ORDER.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return humanize(a).localeCompare(humanize(b))
  })
  const tables = methods.map((method) => {
    const rows = rowsByMethod.get(method)!
    rows.sort((a, b) =>
      method === 'level-up'
        ? a.level - b.level || a.moveEnglish.localeCompare(b.moveEnglish)
        : a.moveEnglish.localeCompare(b.moveEnglish),
    )
    return { method, label: humanize(method), hasLevel: method === 'level-up', rows }
  })

  // Evolution chain tree.
  const evoNode = (node: any): any => ({
    name: node.species.name,
    id: idFromUrl(node.species.url),
    evolvesTo: (node.evolves_to ?? []).map(evoNode),
  })
  const evolution = chainDoc?.chain ? evoNode(chainDoc.chain) : null

  const stats = (pokemon.stats ?? []).map((s: any) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }))
  const total = stats.reduce((sum: number, s: any) => sum + s.value, 0)

  return {
    englishName: enName(species),
    dex: dexNumber(species.id),
    genus: enGenus(species),
    types: (pokemon.types ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({ name: t.type.name, englishName: typeNames.get(t.type.name) ?? humanize(t.type.name) })),
    artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? null,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavor: latestEnFlavor(species),
    stats,
    total,
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
    evolution,
    games: games.map((g) => ({ name: g.name, label: humanize(g.name) })),
    defaultGame,
    selectedGame,
    tables,
  }
}

// ---- move page -------------------------------------------------------------

export async function getMovePage(name: string) {
  const move = await apiGet(`/move/${encodeURIComponent(name.toLowerCase())}`)
  if (!move) return null
  const typeNames = await getTypeEnglishNames()
  const learnedBy = await cardsForRefs(move.learned_by_pokemon ?? [])
  return {
    englishName: enName(move),
    type: move.type
      ? { name: move.type.name, englishName: typeNames.get(move.type.name) ?? humanize(move.type.name) }
      : null,
    category: move.damage_class?.name ? humanize(move.damage_class.name) : '—',
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: enShortEffect(move) ?? latestEnFlavor(move) ?? '—',
    learnedBy,
  }
}

// ---- ability page ----------------------------------------------------------

export async function getAbilityPage(name: string) {
  const ability = await apiGet(`/ability/${encodeURIComponent(name.toLowerCase())}`)
  if (!ability) return null
  const entries: any[] = ability.pokemon ?? []
  const refs = entries.map((e) => e.pokemon)
  const cards = await cardsForRefs(refs)
  const hiddenBySpecies = new Map<number, boolean>()
  entries.forEach((e, i) => {
    const id = idFromUrl(refs[i].url)
    hiddenBySpecies.set(id, e.is_hidden)
  })
  for (const c of cards) c.hiddenAbility = hiddenBySpecies.get(c.id) ?? false
  return {
    englishName: enName(ability),
    effect: enShortEffect(ability) ?? '—',
    pokemon: cards,
  }
}

// ---- type pages ------------------------------------------------------------

export async function getTypeList() {
  return getTypes()
}

const RELATIONS: [string, string][] = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
]

export async function getTypePage(name: string) {
  if (EXCLUDED_TYPES.has(name.toLowerCase())) return null
  const type = await apiGet(`/type/${encodeURIComponent(name.toLowerCase())}`)
  if (!type) return null
  const typeNames = await getTypeEnglishNames()
  const mapRef = (r: Ref) => ({ name: r.name, englishName: typeNames.get(r.name) ?? humanize(r.name) })
  const relations = RELATIONS.map(([term, key]) => ({
    term,
    types: (type.damage_relations?.[key] ?? []).map(mapRef),
  }))
  const pokemon = await cardsForRefs((type.pokemon ?? []).map((p: any) => p.pokemon))
  const moves = (type.moves ?? [])
    .map((m: Ref) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))
  return { englishName: enName(type), relations, pokemon, moves }
}
