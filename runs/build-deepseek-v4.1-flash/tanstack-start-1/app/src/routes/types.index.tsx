import { createFileRoute } from '@tanstack/react-router'
import { TypeTile } from '~/components/TypeBadge'
import { loadTypes } from '~/server/functions'

export const Route = createFileRoute('/types/')({
  loader: () => loadTypes(),
  head: () => ({ meta: [{ title: 'Types – Pokédex' }] }),
  component: TypesPage,
})

function TypesPage() {
  const data = Route.useLoaderData()

  return (
    <>
      <h1>Types</h1>
      <ul className="type-grid">
        {data.types.map((type) => (
          <li key={type.name}>
            <TypeTile type={type} />
          </li>
        ))}
      </ul>
    </>
  )
}
