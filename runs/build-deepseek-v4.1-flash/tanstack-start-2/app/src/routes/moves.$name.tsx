import { createFileRoute } from '@tanstack/react-router'
import { getMovePage } from '../lib/data.functions'
import { displayValue } from '../lib/format'
import { TypeBadge } from '../components/TypeBadge'
import { PokemonCardGrid } from '../components/PokemonCard'
import { NotFoundPage } from '../components/NotFound'

export const Route = createFileRoute('/moves/$name')({
  loader: ({ params }) => getMovePage({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.englishName} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: MovePage,
})

function MovePage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFoundPage />

  return (
    <main>
      <div className="container page">
        <h1>{data.englishName}</h1>

        <dl className="move-summary">
          <div>
            <dt>Type</dt>
            <dd><TypeBadge name={data.typeName} label={data.typeLabel} /></dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{data.category || '—'}</dd>
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

        <section className="panel" aria-labelledby="effect-heading">
          <h2 id="effect-heading">Effect</h2>
          <p>{data.effect}</p>
        </section>

        <section className="panel" aria-labelledby="learned-by-heading">
          <h2 id="learned-by-heading">Learned by</h2>
          <div className="count">{data.learned.length} Pokémon</div>
          <PokemonCardGrid cards={data.learned} />
        </section>
      </div>
    </main>
  )
}
