import { createFileRoute, notFound } from '@tanstack/react-router'
import { fetchMovePage } from '../server/fns'
import { CardList, Section, TypeBadgeLink } from '../components/shared'

export const Route = createFileRoute('/moves/$name')({
  loader: async ({ params }) => {
    const data = await fetchMovePage({ data: { name: params.name } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.englishName} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: MovePage,
})

function MovePage() {
  const data = Route.useLoaderData()
  return (
    <>
      <h1>{data.englishName}</h1>
      <div className="section">
        <dl className="facts">
          <div>
            <dt>Type</dt>
            <dd>{data.type ? <TypeBadgeLink type={data.type} /> : '—'}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{data.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{data.power ?? '—'}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{data.accuracy ?? '—'}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{data.pp ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <Section id="effect" title="Effect">
        <p>{data.effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="count">{data.learnedBy.length} Pokémon</p>
        <CardList cards={data.learnedBy} />
      </Section>
    </>
  )
}
