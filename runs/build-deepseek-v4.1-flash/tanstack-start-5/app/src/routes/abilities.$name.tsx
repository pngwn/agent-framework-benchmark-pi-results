import { createFileRoute } from '@tanstack/react-router'
import { NotFoundPage, Page } from '../components/Layout'
import { PokemonCardList } from '../components/PokemonCard'
import { loadAbilityPage } from '../lib/queries'

export const Route = createFileRoute('/abilities/$name')({
  loader: async ({ params }) => loadAbilityPage({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.notFound ? 'Not found – Pokédex' : `${loaderData?.name ?? ''} – Pokédex`,
      },
    ],
  }),
  component: AbilityPage,
})

function AbilityPage() {
  const data = Route.useLoaderData()
  if (data.notFound) return <NotFoundPage />

  return (
    <Page>
      <main className="page ability-page">
        <h1>{data.name}</h1>

        <section className="panel" aria-labelledby="effect-heading">
          <h2 id="effect-heading">Effect</h2>
          <p>{data.effect}</p>
        </section>

        <section className="panel" aria-labelledby="pokemon-heading">
          <h2 id="pokemon-heading">Pokémon</h2>
          <p className="count">{data.pokemon.length} Pokémon</p>
          <PokemonCardList cards={data.pokemon} />
        </section>
      </main>
    </Page>
  )
}
