import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { getTypePage } from '../../lib/server'
import { CardList, Section, TypeBadgeLink } from '../../lib/components'

export const Route = createFileRoute('/types/$name')({
  loader: async ({ params }) => {
    const data = await getTypePage({ data: { name: params.name } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: TypePage,
})

function TypePage() {
  const d = Route.useLoaderData()
  return (
    <>
      <h1>{d.title}</h1>

      <Section heading="Damage relations" id="damage-relations">
        <dl className="relations">
          {d.relations.map((rel) => (
            <div key={rel.term}>
              <dt>{rel.term}</dt>
              <dd>
                {rel.types.length === 0
                  ? 'None'
                  : rel.types.map((t) => <TypeBadgeLink key={t.name} name={t.name} label={t.label} />)}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section heading="Pokémon" id="pokemon">
        <p className="result-count">{d.pokemon.length} Pokémon</p>
        <CardList cards={d.pokemon} />
      </Section>

      <Section heading="Moves" id="moves">
        <p className="result-count">{d.moves.length} moves</p>
        <ul className="move-links">
          {d.moves.map((m) => (
            <li key={m.name}>
              <Link to="/moves/$name" params={{ name: m.name }}>
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
