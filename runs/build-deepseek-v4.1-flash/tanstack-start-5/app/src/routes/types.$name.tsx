import { createFileRoute, Link } from '@tanstack/react-router'
import { NotFoundPage, Page } from '../components/Layout'
import { PokemonCardList, TypeBadge } from '../components/PokemonCard'
import { loadTypePage } from '../lib/queries'

export const Route = createFileRoute('/types/$name')({
  loader: async ({ params }) => loadTypePage({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.notFound ? 'Not found – Pokédex' : `${loaderData?.name ?? ''} – Pokédex`,
      },
    ],
  }),
  component: TypePage,
})

function TypePage() {
  const data = Route.useLoaderData()
  if (data.notFound) return <NotFoundPage />

  return (
    <Page>
      <main className="page type-page">
        <h1>{data.name}</h1>

        <section className="panel" aria-labelledby="damage-relations-heading">
          <h2 id="damage-relations-heading">Damage relations</h2>
          <dl className="relations">
            {data.relations.map((relation) => (
              <div key={relation.label}>
                <dt>{relation.label}</dt>
                <dd>
                  {relation.types.length === 0 ? (
                    'None'
                  ) : (
                    relation.types.map((type) => (
                      <Link
                        key={type.name}
                        to="/types/$name"
                        params={{ name: type.name }}
                        className="type-link"
                      >
                        <TypeBadge name={type.name} label={type.label} />
                      </Link>
                    ))
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="panel" aria-labelledby="type-pokemon-heading">
          <h2 id="type-pokemon-heading">Pokémon</h2>
          <p className="count">{data.pokemon.length} Pokémon</p>
          <PokemonCardList cards={data.pokemon} />
        </section>

        <section className="panel" aria-labelledby="type-moves-heading">
          <h2 id="type-moves-heading">Moves</h2>
          <p className="count">{data.moves.length} moves</p>
          <ul className="move-link-list">
            {data.moves.map((move) => (
              <li key={move.name}>
                <Link to="/moves/$name" params={{ name: move.name }}>
                  {move.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </Page>
  )
}
