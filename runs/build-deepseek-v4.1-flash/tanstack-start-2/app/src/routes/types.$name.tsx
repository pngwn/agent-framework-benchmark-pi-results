import { Link, createFileRoute } from '@tanstack/react-router'
import { getTypePage } from '../lib/data.functions'
import { PokemonCardGrid } from '../components/PokemonCard'
import { NotFoundPage } from '../components/NotFound'
import { typeBadgeClass } from '../lib/format'

export const Route = createFileRoute('/types/$name')({
  loader: ({ params }) => getTypePage({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.englishName} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: TypePage,
})

function TypePage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFoundPage />

  return (
    <main>
      <div className="container page">
        <h1>{data.englishName}</h1>

        <section className="panel" aria-labelledby="damage-relations-heading">
          <h2 id="damage-relations-heading">Damage relations</h2>
          <dl className="damage-grid">
            {data.relations.map((relation: any) => (
              <div key={relation.label}>
                <dt>{relation.label}</dt>
                <dd>
                  {relation.types.length ? (
                    relation.types.map((type: any) => (
                      <Link key={type.name} to="/types/$name" params={{ name: type.name }} className={typeBadgeClass(type.name)}>
                        {type.label}
                      </Link>
                    ))
                  ) : (
                    'None'
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="panel" aria-labelledby="type-pokemon-heading">
          <h2 id="type-pokemon-heading">Pokémon</h2>
          <div className="count">{data.pokemon.length} Pokémon</div>
          <PokemonCardGrid cards={data.pokemon} />
        </section>

        <section className="panel" aria-labelledby="type-moves-heading">
          <h2 id="type-moves-heading">Moves</h2>
          <div className="count">{data.moves.length} moves</div>
          <ul className="link-grid">
            {data.moves.map((move: any) => (
              <li key={move.name}>
                <Link to="/moves/$name" params={{ name: move.name }}>{move.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
