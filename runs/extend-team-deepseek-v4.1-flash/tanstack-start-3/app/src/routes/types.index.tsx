import { Link, createFileRoute } from '@tanstack/react-router'
import { getTypesPage } from '../server/functions'
import { pageTitle } from '../lib/format'

export const Route = createFileRoute('/types/')({
  loader: () => getTypesPage(),
  head: () => ({ meta: [{ title: pageTitle('Types') }] }),
  component: TypesPage,
})

function TypesPage() {
  const types = Route.useLoaderData()
  return (
    <div className="page">
      <h1>Types</h1>
      <ul className="type-grid">
        {types.map((type) => (
          <li key={type.name}>
            <Link to="/types/$name" params={{ name: type.name }} className={`type-tile type-${type.name}`}>
              {type.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
