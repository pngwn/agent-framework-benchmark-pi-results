import { createFileRoute, notFound } from '@tanstack/react-router'
import { getAbilityPage } from '../../lib/server'
import { CardList, Section } from '../../lib/components'

export const Route = createFileRoute('/abilities/$name')({
  loader: async ({ params }) => {
    const data = await getAbilityPage({ data: { name: params.name } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: AbilityPage,
})

function AbilityPage() {
  const d = Route.useLoaderData()
  return (
    <>
      <h1>{d.title}</h1>
      <Section heading="Effect" id="effect">
        <p>{d.effect}</p>
      </Section>

      <Section heading="Pokémon" id="pokemon">
        <p className="result-count">{d.pokemon.length} Pokémon</p>
        <CardList cards={d.pokemon} />
      </Section>
    </>
  )
}
