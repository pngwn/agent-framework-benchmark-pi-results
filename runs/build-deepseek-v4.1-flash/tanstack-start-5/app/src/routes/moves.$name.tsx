import { createFileRoute, Link } from '@tanstack/react-router'
import { NotFoundPage, Page } from '../components/Layout'
import { PokemonCardList, TypeBadge } from '../components/PokemonCard'
import { loadMovePage } from '../lib/queries'

export const Route = createFileRoute('/moves/$name')({
  loader: async ({ params }) => loadMovePage({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.notFound ? 'Not found – Pokédex' : `${loaderData?.name ?? ''} – Pokédex`,
      },
    ],
  }),
  component: MovePage,
})

function MovePage() {
  const data = Route.useLoaderData()
  if (data.notFound) return <NotFoundPage />

  return (
    <Page>
      <main className="page move-page">
        <h1>{data.name}</h1>

        <dl className="facts">
          <div>
            <dt>Type</dt>
            <dd>
              <Link to="/types/$name" params={{ name: data.typeName }} className="type-link">
                <TypeBadge name={data.typeName} label={data.typeLabel} />
              </Link>
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{data.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{data.power}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{data.accuracy}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{data.pp}</dd>
          </div>
        </dl>

        <section className="panel" aria-labelledby="effect-heading">
          <h2 id="effect-heading">Effect</h2>
          <p>{data.effect}</p>
        </section>

        <section className="panel" aria-labelledby="learned-by-heading">
          <h2 id="learned-by-heading">Learned by</h2>
          <p className="count">{data.learnedBy.length} Pokémon</p>
          <PokemonCardList cards={data.learnedBy} />
        </section>
      </main>
    </Page>
  )
}
