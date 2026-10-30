import { createFileRoute, notFound } from '@tanstack/react-router'
import { getMovePage } from '../server/functions'
import { display, pageTitle } from '../lib/format'
import { Section } from '../components/Section'
import { TypeBadge } from '../components/TypeBadge'
import { PokemonCardList } from '../components/PokemonCard'
import { NotFound } from '../components/NotFound'

export const Route = createFileRoute('/moves/$name')({
  loader: async ({ params }) => {
    const data = await getMovePage({ data: { name: params.name } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  component: MovePage,
  notFoundComponent: NotFound,
})

function MovePage() {
  const move = Route.useLoaderData()
  return (
    <div className="page">
      <h1>{move.label}</h1>
      <dl className="panel facts">
        <div>
          <dt>Type</dt>
          <dd>{move.type ? <TypeBadge type={move.type} /> : display(null)}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{display(move.category)}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{display(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{display(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{display(move.pp)}</dd>
        </div>
      </dl>
      <Section title="Effect">
        <p>{move.effect}</p>
      </Section>
      <Section title="Learned by">
        <p className="count">{move.learnedBy.length} Pokémon</p>
        <PokemonCardList cards={move.learnedBy} />
      </Section>
    </div>
  )
}
