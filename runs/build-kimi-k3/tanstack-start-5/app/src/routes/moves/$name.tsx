import { createFileRoute, notFound } from '@tanstack/react-router'
import { getMovePage } from '../../lib/server'
import { CardList, Section, TypeBadgeLink } from '../../lib/components'
import { MISSING } from '../../lib/format'

export const Route = createFileRoute('/moves/$name')({
  loader: async ({ params }) => {
    const data = await getMovePage({ data: { name: params.name } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: MovePage,
})

function MovePage() {
  const d = Route.useLoaderData()
  return (
    <>
      <h1>{d.title}</h1>
      <dl className="panel fact-list">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadgeLink name={d.typeName} label={d.typeLabel} />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{d.category}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{d.power ?? MISSING}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{d.accuracy ?? MISSING}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{d.pp ?? MISSING}</dd>
        </div>
      </dl>

      <Section heading="Effect" id="effect">
        <p>{d.effect}</p>
      </Section>

      <Section heading="Learned by" id="learned-by">
        <p className="result-count">{d.learnedBy.length} Pokémon</p>
        <CardList cards={d.learnedBy} />
      </Section>
    </>
  )
}
