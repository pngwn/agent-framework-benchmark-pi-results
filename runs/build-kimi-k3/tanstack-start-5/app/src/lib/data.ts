// Data builders for every page. All data comes from the live API over HTTP.

import { apiBase, apiFetch, apiList } from './pokeapi'
import {
  MISSING,
  dexNumber,
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from './format'

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])
const MAX_ALT_FORM_ID = 10000

// ---------------------------------------------------------------------------
// Shared lookups

/** Map of species id -> species API name, from the live species list. */
let speciesMapPromise: Promise<Map<number, string>> | null = null
function getSpeciesMap(): Promise<Map<number, string>> {
  if (!speciesMapPromise) {
    speciesMapPromise = apiList('pokemon-species').then((refs) => {
      const map = new Map<number, string>()
      for (const ref of refs) {
        if (ref.name) map.set(idFromUrl(ref.url), ref.name)
      }
      return map
    })
  }
  return speciesMapPromise
}

/** Map of version group name -> its `order`, from the live API. */
let versionGroupOrdersPromise: Promise<Map<string, number>> | null = null
function getVersionGroupOrders(): Promise<Map<string, number>> {
  if (!versionGroupOrdersPromise) {
    versionGroupOrdersPromise = apiList('version-group').then(async (refs) => {
      const records = await Promise.all(refs.map((r) => apiFetch(`/api/v2/version-group/${idFromUrl(r.url)}`)))
      const map = new Map<string, number>()
      for (const record of records) {
        if (record) map.set(record.name, record.order)
      }
      return map
    })
  }
  return versionGroupOrdersPromise
}

function spriteUrl(pokemonId: number): string {
  return `${apiBase()}/media/sprites/pokemon/${pokemonId}.png`
}

export interface CardData {
  id: number
  name: string
  label: string
  sprite: string
  hidden?: boolean
}

/**
 * Build Pokémon cards from API Pokémon references. Alternate forms (ids above
 * 10000) are excluded, and each species appears at most once, in dex order.
 */
async function cardsFromPokemonRefs(
  refs: { name: string; url: string }[],
  extras?: Map<number, { hidden: boolean }>,
): Promise<CardData[]> {
  const speciesMap = await getSpeciesMap()
  const seen = new Set<number>()
  const cards: CardData[] = []
  for (const ref of refs) {
    const id = idFromUrl(ref.url)
    if (!Number.isFinite(id) || id > MAX_ALT_FORM_ID || seen.has(id)) continue
    const speciesName = speciesMap.get(id)
    if (!speciesName) continue
    seen.add(id)
    cards.push({
      id,
      name: speciesName,
      label: humanize(speciesName),
      sprite: spriteUrl(id),
      hidden: extras?.get(id)?.hidden,
    })
  }
  cards.sort((a, b) => a.id - b.id)
  return cards
}

function typeLabel(record: any): string {
  return englishName(record?.names) ?? humanize(record?.name ?? '')
}

// ---------------------------------------------------------------------------
// Home page

export interface HomeSpecies {
  id: number
  name: string
  label: string
  sprite: string
  types: string[]
  generation: string
}

export async function buildHomeData() {
  const [speciesRefs, typeRefs, generationRefs] = await Promise.all([
    apiList('pokemon-species'),
    apiList('type'),
    apiList('generation'),
  ])

  const speciesIds = new Set(speciesRefs.map((r) => idFromUrl(r.url)))

  const mainTypeRefs = typeRefs.filter((r) => r.name && !EXCLUDED_TYPES.has(r.name))
  const [typeRecords, generationRecords] = await Promise.all([
    Promise.all(mainTypeRefs.map((r) => apiFetch(`/api/v2/type/${idFromUrl(r.url)}`))),
    Promise.all(generationRefs.map((r) => apiFetch(`/api/v2/generation/${idFromUrl(r.url)}`))),
  ])

  // species id -> types (with slots), built from the type records
  const typesBySpecies = new Map<number, { slot: number; type: string }[]>()
  for (const record of typeRecords) {
    if (!record) continue
    for (const entry of record.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon.url)
      if (!speciesIds.has(id)) continue
      let list = typesBySpecies.get(id)
      if (!list) typesBySpecies.set(id, (list = []))
      list.push({ slot: entry.slot, type: record.name })
    }
  }

  // species name -> generation API name
  const generationBySpecies = new Map<string, string>()
  for (const record of generationRecords) {
    if (!record) continue
    for (const ref of record.pokemon_species ?? []) {
      generationBySpecies.set(ref.name, record.name)
    }
  }

  const species: HomeSpecies[] = speciesRefs.map((ref) => {
    const id = idFromUrl(ref.url)
    const types = (typesBySpecies.get(id) ?? [])
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type)
    return {
      id,
      name: ref.name!,
      label: humanize(ref.name!),
      sprite: spriteUrl(id),
      types,
      generation: generationBySpecies.get(ref.name!) ?? '',
    }
  })

  return {
    species,
    types: typeRecords
      .filter(Boolean)
      .map((record) => ({ name: record.name, label: typeLabel(record) })),
    generations: generationRecords
      .filter(Boolean)
      .map((record) => ({ name: record.name, label: typeLabel(record) })),
  }
}

// ---------------------------------------------------------------------------
// Pokémon page

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

export interface MoveRow {
  level: number
  name: string
  label: string
  typeName: string
  typeLabel: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

export interface EvoNode {
  name: string
  label: string
  children: EvoNode[]
}

function parseEvoNode(node: any): EvoNode {
  return {
    name: node.species.name,
    label: humanize(node.species.name),
    children: (node.evolves_to ?? []).map(parseEvoNode),
  }
}

export async function buildPokemonPage(name: string, game?: string) {
  const species = await apiFetch(`/api/v2/pokemon-species/${encodeURIComponent(name)}`)
  if (!species) return null

  const defaultVariety =
    species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0]
  if (!defaultVariety) return null
  const pokemonId = idFromUrl(defaultVariety.pokemon.url)

  const [pokemon, evoChain, vgOrders] = await Promise.all([
    apiFetch(`/api/v2/pokemon/${pokemonId}`),
    species.evolution_chain
      ? apiFetch(`/api/v2/evolution-chain/${idFromUrl(species.evolution_chain.url)}`)
      : null,
    getVersionGroupOrders(),
  ])
  if (!pokemon) return null

  // Version groups in which this Pokémon learns moves, ordered by `order`.
  const gameNames = new Set<string>()
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      gameNames.add(detail.version_group.name)
    }
  }
  const games = [...gameNames]
    .map((vgName) => ({ name: vgName, order: vgOrders.get(vgName) ?? Infinity }))
    .sort((a, b) => a.order - b.order)
    .map((g) => ({ name: g.name, label: humanize(g.name) }))

  const selectedGame =
    game && gameNames.has(game) ? game : (games[games.length - 1]?.name ?? '')

  // Group the moves of the selected version group by learn method.
  const byMethod = new Map<string, { move: string; level: number }[]>()
  for (const move of pokemon.moves ?? []) {
    for (const detail of move.version_group_details ?? []) {
      if (detail.version_group.name !== selectedGame) continue
      const method = detail.move_learn_method.name
      let list = byMethod.get(method)
      if (!list) byMethod.set(method, (list = []))
      list.push({ move: move.move.name, level: detail.level_learned_at })
    }
  }

  // Fetch the move records for display data.
  const moveNames = new Set<string>()
  for (const list of byMethod.values()) for (const entry of list) moveNames.add(entry.move)
  const moveRecords = new Map<string, any>()
  await Promise.all(
    [...moveNames].map(async (moveName) => {
      moveRecords.set(moveName, await apiFetch(`/api/v2/move/${moveName}`))
    }),
  )

  const methods = [...byMethod.entries()]
    .map(([method, entries]) => {
      const hasLevel = method === 'level-up'
      const rows: MoveRow[] = entries.map((entry) => {
        const record = moveRecords.get(entry.move)
        return {
          level: entry.level,
          name: entry.move,
          label: englishName(record?.names) ?? humanize(entry.move),
          typeName: record?.type?.name ?? '',
          typeLabel: typeLabel(record?.type),
          category: record?.damage_class?.name ? humanize(record.damage_class.name) : MISSING,
          power: record?.power ?? null,
          accuracy: record?.accuracy ?? null,
          pp: record?.pp ?? null,
        }
      })
      rows.sort((a, b) =>
        hasLevel
          ? a.level - b.level || a.label.localeCompare(b.label)
          : a.label.localeCompare(b.label),
      )
      return { key: method, label: humanize(method), hasLevel, rows }
    })
    .sort((a, b) => {
      const ai = METHOD_ORDER.indexOf(a.key)
      const bi = METHOD_ORDER.indexOf(b.key)
      if (ai !== -1 || bi !== -1) {
        return (ai === -1 ? METHOD_ORDER.length : ai) - (bi === -1 ? METHOD_ORDER.length : bi)
      }
      return a.label.localeCompare(b.label)
    })

  const stats = (pokemon.stats ?? []).map((s: any) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat as number,
  }))
  const total = stats.reduce((sum: number, s: { value: number }) => sum + s.value, 0)

  const title = englishName(species.names) ?? humanize(species.name)

  return {
    title,
    speciesName: species.name,
    dex: dexNumber(species.id),
    genus:
      species.genera?.find((g: any) => g.language.name === 'en')?.genus ?? null,
    types: (pokemon.types ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({ name: t.type.name, label: humanize(t.type.name) })),
    artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? null,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavor: latestEnglishFlavor(species.flavor_text_entries) ?? MISSING,
    stats,
    total,
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({
        name: a.ability.name,
        label: humanize(a.ability.name),
        hidden: !!a.is_hidden,
      })),
    evolution: evoChain ? parseEvoNode(evoChain.chain) : null,
    moves: {
      games,
      selectedGame,
      methods,
    },
  }
}

// ---------------------------------------------------------------------------
// Move page

export async function buildMovePage(name: string) {
  const move = await apiFetch(`/api/v2/move/${encodeURIComponent(name)}`)
  if (!move) return null

  const effect =
    move.effect_entries?.find((e: any) => e.language.name === 'en')?.short_effect ??
    latestEnglishFlavor(move.flavor_text_entries) ??
    MISSING

  const learnedBy = await cardsFromPokemonRefs(move.learned_by_pokemon ?? [])

  return {
    title: englishName(move.names) ?? humanize(move.name),
    typeName: move.type?.name ?? '',
    typeLabel: move.type ? humanize(move.type.name) : MISSING,
    category: move.damage_class?.name ? humanize(move.damage_class.name) : MISSING,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect,
    learnedBy,
  }
}

// ---------------------------------------------------------------------------
// Ability page

export async function buildAbilityPage(name: string) {
  const ability = await apiFetch(`/api/v2/ability/${encodeURIComponent(name)}`)
  if (!ability) return null

  const effect =
    ability.effect_entries?.find((e: any) => e.language.name === 'en')?.short_effect ??
    MISSING

  const hiddenByPokemon = new Map<number, { hidden: boolean }>()
  for (const entry of ability.pokemon ?? []) {
    hiddenByPokemon.set(idFromUrl(entry.pokemon.url), { hidden: !!entry.is_hidden })
  }
  const pokemon = await cardsFromPokemonRefs(
    (ability.pokemon ?? []).map((entry: any) => entry.pokemon),
    hiddenByPokemon,
  )

  return {
    title: englishName(ability.names) ?? humanize(ability.name),
    effect,
    pokemon,
  }
}

// ---------------------------------------------------------------------------
// Type pages

export async function buildTypeList() {
  const refs = await apiList('type')
  return refs
    .filter((r) => r.name && !EXCLUDED_TYPES.has(r.name))
    .map((r) => ({ name: r.name!, label: humanize(r.name!) }))
}

const RELATIONS: { term: string; key: string }[] = [
  { term: 'Super effective against', key: 'double_damage_to' },
  { term: 'Not very effective against', key: 'half_damage_to' },
  { term: 'No effect against', key: 'no_damage_to' },
  { term: 'Weak to', key: 'double_damage_from' },
  { term: 'Resists', key: 'half_damage_from' },
  { term: 'Immune to', key: 'no_damage_from' },
]

export async function buildTypePage(name: string) {
  const type = await apiFetch(`/api/v2/type/${encodeURIComponent(name)}`)
  if (!type) return null

  const relations = RELATIONS.map(({ term, key }) => ({
    term,
    types: (type.damage_relations?.[key] ?? []).map((ref: any) => ({
      name: ref.name,
      label: humanize(ref.name),
    })),
  }))

  const pokemon = await cardsFromPokemonRefs(
    (type.pokemon ?? []).map((entry: any) => entry.pokemon),
  )

  const moves = (type.moves ?? [])
    .map((ref: any) => ({ name: ref.name as string, label: humanize(ref.name) }))
    .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))

  return {
    title: englishName(type.names) ?? humanize(type.name),
    relations,
    pokemon,
    moves,
  }
}
