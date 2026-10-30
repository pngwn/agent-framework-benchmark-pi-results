import { createFileRoute } from '@tanstack/react-router'
import {
  NotFoundPage,
  PokemonCardList,
  Section,
  TypeBadge,
} from '../components/PokedexUi'
import { getMovePage } from '../server/pokedex'

export const Route = createFileRoute('/moves/$name')({
  loader: ({ params }) => getMovePage({ data: params.name }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.englishName} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: MovePage,
})

function MovePage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFoundPage />

  return (
    <>
      <h1>{data.englishName}</h1>

      <dl className="quick-stats panel">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge name={data.typeName} label={data.typeLabel} small />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{data.category}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{data.power ?? '—'}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{data.accuracy ?? '—'}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{data.pp ?? '—'}</dd>
        </div>
      </dl>

      <Section id="effect" title="Effect">
        <p>{data.effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="result-count">{data.learned.length} Pokémon</p>
        <PokemonCardList cards={data.learned} />
      </Section>
    </>
  )
}
