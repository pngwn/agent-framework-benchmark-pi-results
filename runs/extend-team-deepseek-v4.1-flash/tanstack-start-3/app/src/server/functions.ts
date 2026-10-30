import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { humanize, EM_DASH } from '../lib/format'
import { TEAM_COOKIE, decodeTeam } from '../lib/team'
import type { CardData, LearnTable, TypeRef } from '../lib/types'
import {
  apiBase,
  collapse,
  englishName,
  generationList,
  getAbility,
  getEvolution,
  getMove,
  getPokemonById,
  getSpecies,
  getType,
  latestEnglish,
  moveSummary,
  orNull,
  speciesIndex,
  summarizeMove,
  toCards,
  typeList,
  typeRef,
  versionGroupOrder,
} from './pokeapi'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

const nameInput = (data: { name: string }) => ({ name: String(data.name).toLowerCase() })

export const getConfig = createServerFn({ method: 'GET' }).handler(async () => ({
  mediaBase: apiBase(),
  initialTeam: decodeTeam(getCookie(TEAM_COOKIE)),
}))

export const getHomeData = createServerFn({ method: 'GET' }).handler(async () => {
  const [species, types, generations] = await Promise.all([speciesIndex(), typeList(), generationList()])
  return {
    species,
    types,
    generations: generations.map(({ name, label }) => ({ name, label })),
  }
})

export const getPokemonPage = createServerFn({ method: 'GET' })
  .validator((data: { name: string; game?: string }) => ({ ...nameInput(data), game: data.game }))
  .handler(async ({ data }) => {
    const species = await orNull(getSpecies(data.name))
    if (!species) return null
    const pokemon = await getPokemonById(species.id)

    // Version groups where this Pokémon learns moves, by the version group's order.
    const vgNames = new Set<string>()
    for (const m of pokemon.moves) for (const d of m.version_group_details) vgNames.add(d.version_group.name)
    const orders = new Map(await Promise.all([...vgNames].map(async (n) => [n, await versionGroupOrder(n)] as const)))
    const games = [...vgNames]
      .sort((a, b) => orders.get(a)! - orders.get(b)! || a.localeCompare(b))
      .map((name) => ({ name, label: humanize(name) }))
    const game = games.some((g) => g.name === data.game) ? data.game! : (games.at(-1)?.name ?? null)

    const byMethod = new Map<string, Array<{ move: string; level: number }>>()
    for (const m of pokemon.moves) {
      for (const d of m.version_group_details) {
        if (d.version_group.name !== game) continue
        const rows = byMethod.get(d.move_learn_method.name) ?? []
        rows.push({ move: m.move.name, level: d.level_learned_at })
        byMethod.set(d.move_learn_method.name, rows)
      }
    }
    const methodRank = (m: string) => {
      const i = METHOD_ORDER.indexOf(m)
      return i === -1 ? METHOD_ORDER.length : i
    }
    const methods = [...byMethod.keys()].sort(
      (a, b) => methodRank(a) - methodRank(b) || humanize(a).localeCompare(humanize(b)),
    )

    const [evolution, types, tables] = await Promise.all([
      species.evolution_chain ? getEvolution(species.evolution_chain.url) : null,
      Promise.all([...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeRef(t.type.name))),
      Promise.all(
        methods.map(
          async (method): Promise<LearnTable> => ({
            method,
            label: humanize(method),
            rows: await Promise.all(
              byMethod.get(method)!.map(async (row) => ({ ...row, details: await moveSummary(row.move) })),
            ),
          }),
        ),
      ),
    ])

    const flavor = latestEnglish(species.flavor_text_entries)
    return {
      id: species.id,
      name: species.name,
      label: englishName(species.names, species.name),
      genus: latestEnglish(species.genera)?.genus ?? null,
      flavor: flavor ? collapse(flavor.flavor_text) : null,
      types,
      artwork: pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default ?? null,
      height: pokemon.height,
      weight: pokemon.weight,
      stats: pokemon.stats.map((s) => ({
        name: s.stat.name,
        label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
        value: s.base_stat,
      })),
      abilities: [...pokemon.abilities]
        .sort((a, b) => a.slot - b.slot)
        .map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
      evolution: evolution ?? { name: species.name, children: [] },
      games,
      game,
      tables,
    }
  })

export const getTeamPage = createServerFn({ method: 'GET' }).handler(async () => {
  const names = decodeTeam(getCookie(TEAM_COOKIE))
  if (names.length === 0) {
    return { members: [] as CardData[], types: [] as TypeRef[], coverage: [] }
  }

  const [types, typeDetails, members] = await Promise.all([
    typeList(),
    typeList().then((list) => Promise.all(list.map((type) => getType(type.name)))),
    Promise.all(
      names.map(async (name): Promise<CardData | null> => {
        const species = await orNull(getSpecies(name))
        if (!species) return null
        const pokemon = await orNull(getPokemonById(species.id))
        if (!pokemon) return null
        return {
          id: species.id,
          name: species.name,
          types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((entry) => entry.type.name),
        }
      }),
    ),
  ])

  const present = members.filter((member): member is CardData => member !== null)
  const coverage = typeDetails.map((attacking, index) => {
    const double = new Set(attacking.damage_relations.double_damage_to?.map((type) => type.name))
    const half = new Set(attacking.damage_relations.half_damage_to?.map((type) => type.name))
    const none = new Set(attacking.damage_relations.no_damage_to?.map((type) => type.name))
    let weak = 0
    let resistant = 0

    for (const member of present) {
      let multiplier = 1
      for (const memberType of member.types ?? []) {
        if (none.has(memberType)) multiplier = 0
        else if (double.has(memberType)) multiplier *= 2
        else if (half.has(memberType)) multiplier *= 0.5
      }
      if (multiplier > 1) weak += 1
      else if (multiplier < 1) resistant += 1
    }

    return { ...types[index], weak, resistant }
  })

  return { members: present, types, coverage }
})

export const getMovePage = createServerFn({ method: 'GET' })
  .validator(nameInput)
  .handler(async ({ data }) => {
    const move = await orNull(getMove(data.name))
    if (!move) return null
    const effect = latestEnglish(move.effect_entries)?.short_effect ?? latestEnglish(move.flavor_text_entries)?.flavor_text
    const [summary, learnedBy] = await Promise.all([
      summarizeMove(move),
      toCards(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
    ])
    return { ...summary, effect: effect ? collapse(effect) : EM_DASH, learnedBy }
  })

export const getAbilityPage = createServerFn({ method: 'GET' })
  .validator(nameInput)
  .handler(async ({ data }) => {
    const ability = await orNull(getAbility(data.name))
    if (!ability) return null
    const effect = latestEnglish(ability.effect_entries)?.short_effect ?? latestEnglish(ability.flavor_text_entries)?.flavor_text
    return {
      name: ability.name,
      label: englishName(ability.names, ability.name),
      effect: effect ? collapse(effect) : EM_DASH,
      pokemon: await toCards(ability.pokemon, (ref) => ({ hidden: ref.is_hidden })),
    }
  })

export const getTypesPage = createServerFn({ method: 'GET' }).handler(() => typeList())

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
] as const

export const getTypePage = createServerFn({ method: 'GET' })
  .validator(nameInput)
  .handler(async ({ data }) => {
    const type = await orNull(getType(data.name))
    if (!type) return null
    const [relations, pokemon] = await Promise.all([
      Promise.all(
        RELATIONS.map(async ([term, key]) => ({
          term,
          types: await Promise.all((type.damage_relations[key] ?? []).map((t) => typeRef(t.name))),
        })),
      ),
      toCards(type.pokemon),
    ])
    const moves = type.moves
      .map((m) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label))
    return { name: type.name, label: englishName(type.names, type.name), relations, pokemon, moves }
  })
