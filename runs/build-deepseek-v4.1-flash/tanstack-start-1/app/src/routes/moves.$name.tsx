import { createFileRoute } from '@tanstack/react-router'
import { NotFoundPage } from '~/components/NotFoundPage'
import { PokemonCardList } from '~/components/PokemonCard'
import { Section } from '~/components/Section'
import { TypeLink } from '~/components/TypeBadge'
import { loadMove } from '~/server/functions'

export const Route = createFileRoute('/moves/$name')({
  loader: ({ params }) => loadMove({ data: { name: params.name } }),
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
  component: MovePage,
})

function displayValue(value: number | null): string | number {
  return value ?? '—'
}

function MovePage() {
  const data = Route.useLoaderData()

  if (!data.found) return <NotFoundPage />

  return (
    <>
      <h1>{data.englishName}</h1>

      <dl className="summary-facts move-facts">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeLink type={data.type} />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{data.category}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{displayValue(data.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{displayValue(data.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{displayValue(data.pp)}</dd>
        </div>
      </dl>

      <Section id="effect" title="Effect">
        <p>{data.effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="result-count">{data.learnedBy.length} Pokémon</p>
        <PokemonCardList cards={data.learnedBy} />
      </Section>
    </>
  )
}
