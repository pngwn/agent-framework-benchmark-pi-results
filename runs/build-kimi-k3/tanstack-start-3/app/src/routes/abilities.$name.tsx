import { createFileRoute, notFound } from '@tanstack/react-router'
import { fetchAbilityPage } from '../server/fns'
import { CardList, Section } from '../components/shared'

export const Route = createFileRoute('/abilities/$name')({
  loader: async ({ params }) => {
    const data = await fetchAbilityPage({ data: { name: params.name } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.englishName} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: AbilityPage,
})

function AbilityPage() {
  const data = Route.useLoaderData()
  return (
    <>
      <h1>{data.englishName}</h1>

      <Section id="effect" title="Effect">
        <p>{data.effect}</p>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{data.pokemon.length} Pokémon</p>
        <CardList cards={data.pokemon} />
      </Section>
    </>
  )
}
