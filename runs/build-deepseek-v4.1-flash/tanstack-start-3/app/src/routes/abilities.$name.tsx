import { createFileRoute } from '@tanstack/react-router'
import {
  NotFoundPage,
  PokemonCardList,
  Section,
} from '../components/PokedexUi'
import { getAbilityPage } from '../server/pokedex'

export const Route = createFileRoute('/abilities/$name')({
  loader: ({ params }) => getAbilityPage({ data: params.name }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.englishName} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: AbilityPage,
})

function AbilityPage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFoundPage />

  return (
    <>
      <h1>{data.englishName}</h1>

      <Section id="effect" title="Effect">
        <p>{data.effect}</p>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="result-count">{data.pokemon.length} Pokémon</p>
        <PokemonCardList cards={data.pokemon} />
      </Section>
    </>
  )
}
