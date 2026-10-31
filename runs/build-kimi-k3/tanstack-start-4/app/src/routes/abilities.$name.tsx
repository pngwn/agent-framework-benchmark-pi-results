import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { CardList, Section } from '~/lib/components'
import { getAbilityPageData } from '~/lib/server'

export const Route = createFileRoute('/abilities/$name')({
  loader: ({ params }) => getAbilityPageData({ data: { name: params.name } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? 'Not found'} – Pokédex` }],
  }),
  component: AbilityPage,
})

function AbilityPage() {
  const data = Route.useLoaderData()
  return (
    <>
      <h1>{data.title}</h1>
      <Section title="Effect" headingId="effect-heading">
        <p>{data.effect ?? '—'}</p>
      </Section>
      <Section title="Pokémon" headingId="pokemon-heading">
        <p className="count">{data.pokemon.length} Pokémon</p>
        <CardList cards={data.pokemon} />
      </Section>
    </>
  )
}
