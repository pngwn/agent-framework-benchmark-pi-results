import { Link, createFileRoute } from '@tanstack/react-router'
import { NotFound } from '../components/NotFound'
import { PokemonCardList } from '../components/PokemonCard'
import { getTypeData } from '../lib/data.functions'

export const Route = createFileRoute('/types/$name')({
  loader: ({ params }) => getTypeData({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.label ?? 'Not found'} – Pokédex` }],
  }),
  component: TypePage,
})

function TypePage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFound />

  return (
    <main className="container page">
      <h1>{data.label}</h1>

      <section aria-labelledby="damage-relations-heading" className="panel">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl className="damage-relations">
          {data.relations.map((relation) => (
            <div key={relation.label}>
              <dt>{relation.label}</dt>
              <dd>
                {relation.types.length === 0
                  ? 'None'
                  : relation.types.map((type) => (
                      <Link
                        key={type.name}
                        to="/types/$name"
                        params={{ name: type.name }}
                        className={`type-badge type-${type.name}`}
                      >
                        {type.label}
                      </Link>
                    ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="type-pokemon-heading" className="panel">
        <h2 id="type-pokemon-heading">Pokémon</h2>
        <p className="result-count">{data.pokemon.length} Pokémon</p>
        <PokemonCardList cards={data.pokemon} />
      </section>

      <section aria-labelledby="type-moves-heading" className="panel">
        <h2 id="type-moves-heading">Moves</h2>
        <p className="result-count">{data.moves.length} moves</p>
        <ul className="move-links">
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
  )
}
