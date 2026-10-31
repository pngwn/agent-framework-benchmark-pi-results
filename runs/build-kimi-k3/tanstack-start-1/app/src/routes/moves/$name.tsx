import { createFileRoute } from '@tanstack/react-router'
import { getMoveData } from '../../server/data'
import { CardGrid } from '../../components/PokemonCard'
import { NotFound } from '../../components/NotFound'
import { Section } from '../../components/Section'
import { TypeBadgeLink } from '../../components/TypeBadge'
import { MISSING } from '../../lib/format'

export const Route = createFileRoute('/moves/$name')({
  loader: ({ params }) => getMoveData({ data: params.name }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: MovePage,
})

function MovePage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFound />

  const value = (v: number | string | null) => (v === null || v === '' ? MISSING : v)

  return (
    <>
      <h1>{data.title}</h1>

      <dl className="facts facts-card">
        <div className="fact">
          <dt>Type</dt>
          <dd>
            {data.type ? (
              <TypeBadgeLink name={data.type.name} display={data.type.display} />
            ) : (
              MISSING
            )}
          </dd>
        </div>
        <div className="fact">
          <dt>Category</dt>
          <dd>{value(data.category)}</dd>
        </div>
        <div className="fact">
          <dt>Power</dt>
          <dd>{value(data.power)}</dd>
        </div>
        <div className="fact">
          <dt>Accuracy</dt>
          <dd>{value(data.accuracy)}</dd>
        </div>
        <div className="fact">
          <dt>PP</dt>
          <dd>{value(data.pp)}</dd>
        </div>
      </dl>

      <Section name="Effect">
        <p>{data.effect ?? MISSING}</p>
      </Section>

      <Section name="Learned by">
        <p className="result-count">{data.learnedBy.length} Pokémon</p>
        <CardGrid cards={data.learnedBy} />
      </Section>
    </>
  )
}
