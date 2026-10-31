import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { CardList, Section, TypeBadge } from '~/lib/components'
import { getMovePageData } from '~/lib/server'

export const Route = createFileRoute('/moves/$name')({
  loader: ({ params }) => getMovePageData({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? 'Not found'} – Pokédex` }],
  }),
  component: MovePage,
})

function MovePage() {
  const data = Route.useLoaderData()
  return (
    <>
      <h1>{data.title}</h1>
      <dl className="fact-list move-facts">
        <div className="fact">
          <dt>Type</dt>
          <dd>
            {data.type ? (
              <TypeBadge name={data.type.name} label={data.type.englishName} />
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div className="fact">
          <dt>Category</dt>
          <dd>{data.category ?? '—'}</dd>
        </div>
        <div className="fact">
          <dt>Power</dt>
          <dd>{data.power ?? '—'}</dd>
        </div>
        <div className="fact">
          <dt>Accuracy</dt>
          <dd>{data.accuracy ?? '—'}</dd>
        </div>
        <div className="fact">
          <dt>PP</dt>
          <dd>{data.pp ?? '—'}</dd>
        </div>
      </dl>
      <Section title="Effect" headingId="effect-heading">
        <p>{data.effect ?? '—'}</p>
      </Section>
      <Section title="Learned by" headingId="learned-by-heading">
        <p className="count">{data.learnedBy.length} Pokémon</p>
        <CardList cards={data.learnedBy} />
      </Section>
    </>
  )
}
