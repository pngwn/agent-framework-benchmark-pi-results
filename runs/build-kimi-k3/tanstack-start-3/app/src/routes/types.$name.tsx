import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { fetchTypePage } from '../server/fns'
import { CardList, Section, TypeBadgeLink } from '../components/shared'

export const Route = createFileRoute('/types/$name')({
  loader: async ({ params }) => {
    const data = await fetchTypePage({ data: { name: params.name } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.englishName} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: TypePage,
})

function TypePage() {
  const data = Route.useLoaderData()
  return (
    <>
      <h1>{data.englishName}</h1>

      <Section id="damage-relations" title="Damage relations">
        <dl className="relations">
          {data.relations.map((rel: any) => (
            <div key={rel.term} className="relation">
              <dt>{rel.term}</dt>
              <dd>
                {rel.types.length > 0
                  ? rel.types.map((t: any) => <TypeBadgeLink key={t.name} type={t} />)
                  : 'None'}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{data.pokemon.length} Pokémon</p>
        <CardList cards={data.pokemon} />
      </Section>

      <Section id="moves" title="Moves">
        <p className="count">{data.moves.length} moves</p>
        <ul className="moves-list">
          {data.moves.map((m: any) => (
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
