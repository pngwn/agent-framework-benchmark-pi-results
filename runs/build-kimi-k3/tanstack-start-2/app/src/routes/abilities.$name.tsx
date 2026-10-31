import { createFileRoute } from '@tanstack/react-router'
import { CardGrid } from '~/components/PokemonCard'
import { NotFound } from '~/components/NotFound'
import { EM_DASH } from '~/lib/format'
import { fetchAbilityPage } from '~/server/functions'

export const Route = createFileRoute('/abilities/$name')({
  loader: ({ params }) => fetchAbilityPage({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.name} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: AbilityPage,
})

function AbilityPage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFound />

  return (
    <>
      <h1 className="page-title">{data.name}</h1>
      <section className="section-card" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{data.effect ?? EM_DASH}</p>
      </section>

      <section className="section-card" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="count-text">{data.pokemon.length} Pokémon</p>
        <CardGrid cards={data.pokemon} />
      </section>
    </>
  )
}
