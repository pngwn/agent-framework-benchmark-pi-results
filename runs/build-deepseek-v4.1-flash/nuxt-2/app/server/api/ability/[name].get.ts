import {
  apiRequest,
  englishName,
  getSpecies,
  idFromUrl,
  makeCards,
} from '../../utils/pokedex'

export default defineEventHandler(async (event) => {
  const name = String(getRouterParam(event, 'name') ?? '')
  const [ability, species] = await Promise.all([
    apiRequest(`ability/${name}`),
    getSpecies(),
  ])
  if (!ability) return { notFound: true }

  const hiddenIds = new Set<number>()
  const ids: number[] = []
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon?.url)
    if (id === null) continue
    ids.push(id)
    if (entry.is_hidden) hiddenIds.add(id)
  }
  const cards = makeCards(ids, species, { hiddenIds })
  const effect = ability.effect_entries?.find((entry: any) => entry.language?.name === 'en')?.short_effect?.trim() || '—'

  return {
    notFound: false,
    name: ability.name,
    label: englishName(ability),
    effect,
    count: cards.length,
    cards,
  }
})
