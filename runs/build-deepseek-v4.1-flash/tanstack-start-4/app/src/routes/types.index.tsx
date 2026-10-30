import { Link, createFileRoute } from '@tanstack/react-router'
import { getTypeListData } from '../lib/data.functions'

export const Route = createFileRoute('/types/')({
  loader: () => getTypeListData(),
  head: () => ({ meta: [{ title: 'Types – Pokédex' }] }),
  component: TypesPage,
})

function TypesPage() {
  const types = Route.useLoaderData()
  return (
    <main className="container page">
      <h1>Types</h1>
      <ul className="type-grid">
        {types.map((type) => (
          <li key={type.name}>
            <Link
              to="/types/$name"
              params={{ name: type.name }}
              className={`type-tile type-${type.name}`}
            >
              {type.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
