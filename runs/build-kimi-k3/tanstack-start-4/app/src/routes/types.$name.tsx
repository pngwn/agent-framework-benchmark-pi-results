import { Link, createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { CardList, Section, TypeBadge } from '~/lib/components'
import { getTypePageData } from '~/lib/server'

export const Route = createFileRoute('/types/$name')({
  loader: ({ params }) => getTypePageData({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? 'Not found'} – Pokédex` }],
  }),
  component: TypePage,
})

function TypePage() {
  const data = Route.useLoaderData()
  return (
    <>
      <h1>{data.title}</h1>
      <Section title="Damage relations" headingId="damage-relations-heading">
        <dl className="relations">
          {data.relations.map((group) => (
            <div key={group.label} className="relation">
              <dt>{group.label}</dt>
              <dd>
                {group.types.length > 0 ? (
                  group.types.map((t) => (
                    <TypeBadge key={t.name} name={t.name} label={t.englishName} />
                  ))
                ) : (
                  'None'
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Pokémon" headingId="pokemon-heading">
        <p className="count">{data.pokemon.length} Pokémon</p>
        <CardList cards={data.pokemon} />
      </Section>
      <Section title="Moves" headingId="moves-heading">
        <p className="count">{data.moves.length} moves</p>
        <ul className="move-list">
          {data.moves.map((m) => (
            <li key={m.name}>
              <Link to="/moves/$name" params={{ name: m.name }}>
                {m.humanName}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
