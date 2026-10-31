import { createFileRoute } from '@tanstack/react-router'
import { getTypeListData } from '../../server/data'
import { TypeBadgeLink } from '../../components/TypeBadge'

export const Route = createFileRoute('/types/')({
  loader: () => getTypeListData(),
  head: () => ({ meta: [{ title: 'Types – Pokédex' }] }),
  component: TypesPage,
})

function TypesPage() {
  const types = Route.useLoaderData()

  return (
    <>
      <h1>Types</h1>
      <ul className="type-list">
        {types.map((type) => (
          <li key={type.name}>
            <TypeBadgeLink name={type.name} display={type.display} />
          </li>
        ))}
      </ul>
    </>
  )
}
