import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { getTypePage } from '../server/functions'
import { pageTitle } from '../lib/format'
import { Section } from '../components/Section'
import { TypeBadge } from '../components/TypeBadge'
import { PokemonCardList } from '../components/PokemonCard'
import { NotFound } from '../components/NotFound'

export const Route = createFileRoute('/types/$name')({
  loader: async ({ params }) => {
    const data = await getTypePage({ data: { name: params.name } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  component: TypePage,
  notFoundComponent: NotFound,
})

function TypePage() {
  const type = Route.useLoaderData()
  return (
    <div className="page">
      <h1>{type.label}</h1>
      <Section title="Damage relations">
        <dl className="relations">
          {type.relations.map((relation) => (
            <div key={relation.term} className="relation">
              <dt>{relation.term}</dt>
              <dd>
                {relation.types.length === 0 ? (
                  'None'
                ) : (
                  <span className="badge-row">
                    {relation.types.map((t) => (
                      <TypeBadge key={t.name} type={t} />
                    ))}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Pokémon">
        <p className="count">{type.pokemon.length} Pokémon</p>
        <PokemonCardList cards={type.pokemon} />
      </Section>
      <Section title="Moves">
        <p className="count">{type.moves.length} moves</p>
        <ul className="link-columns">
          {type.moves.map((move) => (
            <li key={move.name}>
              <Link to="/moves/$name" params={{ name: move.name }}>
                {move.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
