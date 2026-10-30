import { createFileRoute } from '@tanstack/react-router'
import { NotFound } from '../components/NotFound'
import { PokemonCardList } from '../components/PokemonCard'
import { getAbilityData } from '../lib/data.functions'

export const Route = createFileRoute('/abilities/$name')({
  loader: ({ params }) => getAbilityData({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.label ?? 'Not found'} – Pokédex` }],
  }),
  component: AbilityPage,
})

function AbilityPage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFound />

  return (
    <main className="container page">
      <h1>{data.label}</h1>

      <section aria-labelledby="effect-heading" className="panel">
        <h2 id="effect-heading">Effect</h2>
        <p>{data.effect}</p>
      </section>

      <section aria-labelledby="ability-pokemon-heading" className="panel">
        <h2 id="ability-pokemon-heading">Pokémon</h2>
        <p className="result-count">{data.pokemon.length} Pokémon</p>
        <PokemonCardList cards={data.pokemon} />
      </section>
    </main>
  )
}
