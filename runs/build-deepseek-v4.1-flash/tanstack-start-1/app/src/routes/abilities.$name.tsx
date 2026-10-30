import { createFileRoute } from '@tanstack/react-router'
import { NotFoundPage } from '~/components/NotFoundPage'
import { PokemonCardList } from '~/components/PokemonCard'
import { Section } from '~/components/Section'
import { loadAbility } from '~/server/functions'

export const Route = createFileRoute('/abilities/$name')({
  loader: ({ params }) => loadAbility({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title:
          loaderData && !loaderData.found
            ? 'Not found – Pokédex'
            : `${loaderData?.englishName ?? ''} – Pokédex`,
      },
    ],
  }),
  component: AbilityPage,
})

function AbilityPage() {
  const data = Route.useLoaderData()

  if (!data.found) return <NotFoundPage />

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
