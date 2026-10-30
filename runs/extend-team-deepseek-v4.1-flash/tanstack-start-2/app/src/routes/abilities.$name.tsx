import { createFileRoute, notFound } from '@tanstack/react-router'
import { getAbilityPage } from '../server/functions'
import { pageTitle } from '../lib/format'
import { Section } from '../components/Section'
import { PokemonCardList } from '../components/PokemonCard'
import { NotFound } from '../components/NotFound'

export const Route = createFileRoute('/abilities/$name')({
  loader: async ({ params }) => {
    const data = await getAbilityPage({ data: { name: params.name } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  component: AbilityPage,
  notFoundComponent: NotFound,
})

function AbilityPage() {
  const ability = Route.useLoaderData()
  return (
    <div className="page">
      <h1>{ability.label}</h1>
      <Section title="Effect">
        <p>{ability.effect}</p>
      </Section>
      <Section title="Pokémon">
        <p className="count">{ability.pokemon.length} Pokémon</p>
        <PokemonCardList cards={ability.pokemon} />
      </Section>
    </div>
  )
}
