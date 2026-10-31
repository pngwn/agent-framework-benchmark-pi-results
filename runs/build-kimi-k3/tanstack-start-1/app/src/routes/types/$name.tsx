import { Link, createFileRoute } from '@tanstack/react-router'
import { getTypeData } from '../../server/data'
import { CardGrid } from '../../components/PokemonCard'
import { NotFound } from '../../components/NotFound'
import { Section } from '../../components/Section'
import { TypeBadgeLink } from '../../components/TypeBadge'

export const Route = createFileRoute('/types/$name')({
  loader: ({ params }) => getTypeData({ data: params.name }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: TypePage,
})

function TypePage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFound />

  return (
    <>
      <h1>{data.title}</h1>

      <Section name="Damage relations">
        <dl className="relations">
          {data.relations.map((relation) => (
            <div className="relation" key={relation.label}>
              <dt>{relation.label}</dt>
              <dd>
                {relation.types.length === 0
                  ? 'None'
                  : relation.types.map((t) => (
                      <TypeBadgeLink key={t.name} name={t.name} display={t.display} />
                    ))}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section name="Pokémon">
        <p className="result-count">{data.pokemon.length} Pokémon</p>
        <CardGrid cards={data.pokemon} />
      </Section>

      <Section name="Moves">
        <p className="result-count">{data.moves.length} moves</p>
        <ul className="move-list">
          {data.moves.map((move) => (
            <li key={move.name}>
              <Link to="/moves/$name" params={{ name: move.name }}>
                {move.display}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
