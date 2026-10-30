import { createFileRoute } from '@tanstack/react-router'
import { getAbilityPage } from '../lib/data.functions'
import { PokemonCardGrid } from '../components/PokemonCard'
import { NotFoundPage } from '../components/NotFound'

export const Route = createFileRoute('/abilities/$name')({
  loader: ({ params }) => getAbilityPage({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.englishName} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: AbilityPage,
})

function AbilityPage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFoundPage />

  return (
    <main>
      <div className="container page">
        <h1>{data.englishName}</h1>

        <section className="panel" aria-labelledby="ability-effect-heading">
          <h2 id="ability-effect-heading">Effect</h2>
          <p>{data.effect}</p>
        </section>

        <section className="panel" aria-labelledby="ability-pokemon-heading">
          <h2 id="ability-pokemon-heading">Pokémon</h2>
          <div className="count">{data.pokemon.length} Pokémon</div>
          <PokemonCardGrid cards={data.pokemon} />
        </section>
      </div>
    </main>
  )
}
