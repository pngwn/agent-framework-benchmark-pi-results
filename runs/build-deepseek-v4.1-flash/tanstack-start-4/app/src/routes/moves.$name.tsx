import { Link, createFileRoute } from '@tanstack/react-router'
import { NotFound } from '../components/NotFound'
import { PokemonCardList } from '../components/PokemonCard'
import { getMoveData } from '../lib/data.functions'
import { displayOrDash } from '../lib/format'

export const Route = createFileRoute('/moves/$name')({
  loader: ({ params }) => getMoveData({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.label ?? 'Not found'} – Pokédex` }],
  }),
  component: MovePage,
})

function MovePage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFound />

  return (
    <main className="container page">
      <h1>{data.label}</h1>

      <div className="panel">
        <dl className="fact-list">
          <div>
            <dt>Type</dt>
            <dd>
              <Link
                to="/types/$name"
                params={{ name: data.type.name }}
                className={`type-badge type-${data.type.name}`}
              >
                {data.type.label}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{data.category || '—'}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{displayOrDash(data.power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{displayOrDash(data.accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{displayOrDash(data.pp)}</dd>
          </div>
        </dl>
      </div>

      <section aria-labelledby="effect-heading" className="panel">
        <h2 id="effect-heading">Effect</h2>
        <p>{data.effect}</p>
      </section>

      <section aria-labelledby="learned-by-heading" className="panel">
        <h2 id="learned-by-heading">Learned by</h2>
        <p className="result-count">{data.pokemon.length} Pokémon</p>
        <PokemonCardList cards={data.pokemon} />
      </section>
    </main>
  )
}
