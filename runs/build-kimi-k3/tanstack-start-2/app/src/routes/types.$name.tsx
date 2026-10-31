import { createFileRoute } from '@tanstack/react-router'
import { CardGrid } from '~/components/PokemonCard'
import { NotFound } from '~/components/NotFound'
import { TypeBadge } from '~/components/TypeBadge'
import { fetchTypePage } from '~/server/functions'

export const Route = createFileRoute('/types/$name')({
  loader: ({ params }) => fetchTypePage({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.name} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: TypePage,
})

function TypePage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFound />

  return (
    <>
      <h1 className="page-title">{data.name}</h1>
      <section className="section-card" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl className="dl-grid damage-relations">
          {data.relations.map((relation) => (
            <div key={relation.term}>
              <dt>{relation.term}</dt>
              <dd>
                {relation.types.length === 0 ? (
                  'None'
                ) : (
                  <span className="type-list-badges">
                    {relation.types.map((type: { name: string; en: string }) => (
                      <TypeBadge key={type.name} name={type.name} label={type.en} link />
                    ))}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section-card" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p className="count-text">{data.pokemon.length} Pokémon</p>
        <CardGrid cards={data.pokemon} />
      </section>

      <section className="section-card" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p className="count-text">{data.moves.length} moves</p>
        <ul className="moves-list">
          {data.moves.map((move: { name: string; label: string }) => (
            <li key={move.name}>
              <a href={`/moves/${move.name}`}>{move.label}</a>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
