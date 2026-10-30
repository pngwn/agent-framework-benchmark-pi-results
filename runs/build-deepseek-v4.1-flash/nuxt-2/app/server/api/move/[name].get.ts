import {
  apiRequest,
  englishName,
  englishShortEffect,
  getSpecies,
  getTypes,
  humanize,
  idFromUrl,
  makeCards,
} from '../../utils/pokedex'

export default defineEventHandler(async (event) => {
  const name = String(getRouterParam(event, 'name') ?? '')
  const [move, species, types] = await Promise.all([
    apiRequest(`move/${name}`),
    getSpecies(),
    getTypes(),
  ])
  if (!move) return { notFound: true }

  const type = types.find((entry) => entry.name === move.type?.name)
  const learnedByIds = (move.learned_by_pokemon ?? [])
    .map((entry: any) => idFromUrl(entry.url))
    .filter((id: number | null): id is number => id !== null)
  const cards = makeCards(learnedByIds, species)

  return {
    notFound: false,
    name: move.name,
    label: englishName(move),
    type: {
      name: move.type?.name ?? '',
      label: type?.englishName ?? humanize(move.type?.name),
    },
    category: humanize(move.damage_class?.name),
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: englishShortEffect(move),
    count: cards.length,
    cards,
  }
})
