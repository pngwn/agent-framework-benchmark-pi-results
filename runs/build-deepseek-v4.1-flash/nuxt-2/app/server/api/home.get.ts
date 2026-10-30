import {
  getGenerations,
  getSpecies,
  getTypes,
  humanize,
  makeCards,
  pokemonTypesBySpecies,
} from '../utils/pokedex'

const PAGE_SIZE = 48

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = String(query.q ?? '').trim().toLowerCase()
  const typeName = String(query.type ?? '').trim()
  const generationName = String(query.generation ?? '').trim()
  const requestedPage = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1)

  const [species, types, generations] = await Promise.all([
    getSpecies(),
    getTypes(),
    getGenerations(),
  ])

  const typeMap = pokemonTypesBySpecies(types)

  let typeIds: Set<number> | null = null
  if (typeName) {
    const type = types.find((entry) => entry.name === typeName)
    typeIds = new Set(
      (type?.pokemon ?? [])
        .map((entry) => {
          const match = String(entry.pokemon?.url ?? '').match(/\/(\d+)\/?$/)
          return match ? Number(match[1]) : null
        })
        .filter((id): id is number => id !== null && id <= 10000),
    )
  }

  let generationIds: Set<number> | null = null
  if (generationName) {
    const generation = generations.find((entry) => entry.name === generationName)
    generationIds = new Set(generation?.speciesIds ?? [])
  }

  const matches = species.filter((entry) => {
    if (search && !humanize(entry.name).toLowerCase().includes(search)) return false
    if (typeIds && !typeIds.has(entry.id)) return false
    if (generationIds && !generationIds.has(entry.id)) return false
    return true
  })

  const count = matches.length
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  const start = (page - 1) * PAGE_SIZE
  const cards = makeCards(
    matches.slice(start, start + PAGE_SIZE).map((entry) => entry.id),
    species,
    { typeMap },
  )

  return {
    count,
    page,
    totalPages,
    cards,
    typeOptions: types.map((type) => ({ name: type.name, label: type.englishName })),
    generationOptions: generations.map((generation) => ({ name: generation.name, label: generation.englishName })),
    filters: { q: String(query.q ?? ''), type: typeName, generation: generationName },
  }
})
