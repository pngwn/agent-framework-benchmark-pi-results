import { createFileRoute } from '@tanstack/react-router'
import { CardGrid } from '~/components/PokemonCard'
import { NotFound } from '~/components/NotFound'
import { TypeBadge } from '~/components/TypeBadge'
import { EM_DASH, valueOrDash } from '~/lib/format'
import { fetchMovePage } from '~/server/functions'

export const Route = createFileRoute('/moves/$name')({
  loader: ({ params }) => fetchMovePage({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.name} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: MovePage,
})

function MovePage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFound />

  return (
    <>
      <h1 className="page-title">{data.name}</h1>
      <div className="section-card">
        <dl className="dl-grid move-facts">
          <div>
            <dt>Type</dt>
            <dd>
              <TypeBadge name={data.typeName} label={data.typeEn} link />
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{data.category || EM_DASH}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{valueOrDash(data.power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{valueOrDash(data.accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{valueOrDash(data.pp)}</dd>
          </div>
        </dl>
      </div>

      <section className="section-card" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{data.effect ?? EM_DASH}</p>
      </section>

      <section className="section-card" aria-labelledby="learned-by-heading">
        <h2 id="learned-by-heading">Learned by</h2>
        <p className="count-text">{data.learnedBy.length} Pokémon</p>
        <CardGrid cards={data.learnedBy} />
      </section>
    </>
  )
}
