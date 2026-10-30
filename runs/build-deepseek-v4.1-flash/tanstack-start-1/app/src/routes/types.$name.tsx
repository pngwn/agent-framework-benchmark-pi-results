import { createFileRoute, Link } from '@tanstack/react-router'
import { NotFoundPage } from '~/components/NotFoundPage'
import { PokemonCardList } from '~/components/PokemonCard'
import { Section } from '~/components/Section'
import { TypeLink } from '~/components/TypeBadge'
import { loadType } from '~/server/functions'

export const Route = createFileRoute('/types/$name')({
  loader: ({ params }) => loadType({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title:
          loaderData && !loaderData.found
            ? 'Not found – Pokédex'
            : `${loaderData?.englishName ?? ''} – Pokédex`,
      },
    ],
  }),
  component: TypePage,
})

function TypePage() {
  const data = Route.useLoaderData()

  if (!data.found) return <NotFoundPage />

  return (
    <>
      <h1>{data.englishName}</h1>

      <Section id="damage-relations" title="Damage relations">
        <dl className="damage-relations">
          {data.relations.map((relation) => (
            <div className="relation" key={relation.term}>
              <dt>{relation.term}</dt>
              <dd>
                {relation.types.length ? (
                  relation.types.map((type) => <TypeLink key={type.name} type={type} />)
                ) : (
                  'None'
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="result-count">{data.pokemon.length} Pokémon</p>
        <PokemonCardList cards={data.pokemon} />
      </Section>

      <Section id="moves" title="Moves">
        <p className="result-count">{data.moves.length} moves</p>
        <ul className="move-link-grid">
          {data.moves.map((move) => (
            <li key={move.name}>
              <Link to="/moves/$name" params={{ name: move.name }}>
                {move.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
