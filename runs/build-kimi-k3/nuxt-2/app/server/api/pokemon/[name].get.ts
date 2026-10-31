function mapEvolutionNode(node: any): any {
  return {
    name: node.species?.name,
    label: humanizeName(node.species?.name ?? ''),
    children: (node.evolves_to ?? []).map(mapEvolutionNode),
  }
}

export default defineEventHandler(async (event) => {
  const name = String(getRouterParam(event, 'name') ?? '').toLowerCase()
  const species = await apiGet(`/pokemon-species/${encodeURIComponent(name)}`)
  if (!species) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const varieties = species.varieties ?? []
  const defaultVariety = varieties.find((v: any) => v.is_default) ?? varieties[0]
  if (!defaultVariety) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const pokemon = await apiGet(`/pokemon/${idFromUrl(defaultVariety.pokemon.url)}`)
  if (!pokemon) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const idx = await getIndex()

  // Evolution chain
  let evolution: any[] = []
  const chainUrl = species.evolution_chain?.url
  if (chainUrl) {
    const chain = await apiGet(`/evolution-chain/${idFromUrl(chainUrl)}`)
    if (chain?.chain) evolution = [mapEvolutionNode(chain.chain)]
  }

  // Version groups in which this Pokémon learns moves, ordered by their order
  const vgNames = [
    ...new Set(
      (pokemon.moves ?? []).flatMap((m: any) =>
        (m.version_group_details ?? []).map((d: any) => d.version_group?.name).filter(Boolean),
      ),
    ),
  ] as string[]
  const vgRecords = await mapLimit(vgNames, 16, (n) => apiGet(`/version-group/${n}`))
  const versionGroups = vgRecords
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .map((v) => ({ name: v.name, label: humanizeName(v.name), order: v.order }))

  const stats = (pokemon.stats ?? []).map((s: any) => ({ name: s.stat?.name ?? '', base: s.base_stat ?? 0 }))
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null

  return {
    id: species.id,
    name: species.name,
    enName: enName(species.names, species.name),
    genus: (species.genera ?? []).find((g: any) => g.language?.name === 'en')?.genus ?? null,
    flavor: latestEnFlavor(species.flavor_text_entries),
    types: (pokemon.types ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({
        name: t.type.name,
        label: idx.typeLabels[t.type.name] ?? humanizeName(t.type.name),
      })),
    artwork,
    height: pokemon.height ?? null,
    weight: pokemon.weight ?? null,
    stats,
    abilities: (pokemon.abilities ?? [])
      .slice()
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({
        name: a.ability.name,
        label: humanizeName(a.ability.name),
        hidden: !!a.is_hidden,
      })),
    evolution,
    versionGroups,
  }
})
