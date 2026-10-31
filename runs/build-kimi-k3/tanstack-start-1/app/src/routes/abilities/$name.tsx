import { createFileRoute } from '@tanstack/react-router'
import { getAbilityData } from '../../server/data'
import { CardGrid } from '../../components/PokemonCard'
import { NotFound } from '../../components/NotFound'
import { Section } from '../../components/Section'
import { MISSING } from '../../lib/format'

export const Route = createFileRoute('/abilities/$name')({
  loader: ({ params }) => getAbilityData({ data: params.name }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: AbilityPage,
})

function AbilityPage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFound />

  return (
    <>
      <h1>{data.title}</h1>

      <Section name="Effect">
        <p>{data.effect ?? MISSING}</p>
      </Section>

      <Section name="Pokémon">
        <p className="result-count">{data.pokemon.length} Pokémon</p>
        <CardGrid cards={data.pokemon} />
      </Section>
    </>
  )
}
