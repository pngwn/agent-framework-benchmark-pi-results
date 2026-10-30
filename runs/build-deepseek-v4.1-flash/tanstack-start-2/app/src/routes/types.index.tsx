import { Link, createFileRoute } from '@tanstack/react-router'
import { getTypeList } from '../lib/data.functions'

export const Route = createFileRoute('/types/')({
  loader: () => getTypeList(),
  head: () => ({ meta: [{ title: 'Types – Pokédex' }] }),
  component: TypesPage,
})

function TypesPage() {
  const types = Route.useLoaderData()
  return (
    <main>
      <div className="container page">
        <h1>Types</h1>
        <ul className="type-index">
          {types.map((type) => (
            <li key={type.name}>
              <Link to="/types/$name" params={{ name: type.name }} className={`type-badge type-${type.name}`}>
                {type.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
