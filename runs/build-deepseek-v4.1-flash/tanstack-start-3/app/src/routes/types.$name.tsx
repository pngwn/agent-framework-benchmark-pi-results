import { Link, createFileRoute } from '@tanstack/react-router'
import {
  NotFoundPage,
  PokemonCardList,
  Section,
  TypeBadge,
} from '../components/PokedexUi'
import { getTypePage } from '../server/pokedex'

const RELATION_ROWS = [
  ['Super effective against', 'doubleDamageTo'],
  ['Not very effective against', 'halfDamageTo'],
  ['No effect against', 'noDamageTo'],
  ['Weak to', 'doubleDamageFrom'],
  ['Resists', 'halfDamageFrom'],
  ['Immune to', 'noDamageFrom'],
] as const

export const Route = createFileRoute('/types/$name')({
  loader: ({ params }) => getTypePage({ data: params.name }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.englishName} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: TypePage,
})

function TypePage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFoundPage />

  return (
    <>
      <h1>{data.englishName}</h1>

      <Section id="damage-relations" title="Damage relations">
        <dl className="relations">
          {RELATION_ROWS.map(([label, key]) => {
            const related = data.relation[key] as Array<{ name: string; label: string }>
            return (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {related.length === 0 ? (
                    'None'
                  ) : (
                    <span className="inline-types">
                      {related.map((type) => (
                        <TypeBadge key={type.name} name={type.name} label={type.label} small />
                      ))}
                    </span>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="result-count">{data.pokemon.length} Pokémon</p>
        <PokemonCardList cards={data.pokemon} />
      </Section>

      <Section id="moves" title="Moves">
        <p className="result-count">{data.moves.length} moves</p>
        <ul className="move-links">
          {data.moves.map((move: { name: string; label: string }) => (
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
