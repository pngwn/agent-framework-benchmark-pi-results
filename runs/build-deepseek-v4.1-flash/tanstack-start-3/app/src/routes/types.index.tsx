import { Link, createFileRoute } from '@tanstack/react-router'
import { getTypesPage } from '../server/pokedex'

export const Route = createFileRoute('/types/')({
  loader: () => getTypesPage(),
  head: () => ({ meta: [{ title: 'Types – Pokédex' }] }),
  component: TypesPage,
})

function TypesPage() {
  const types = Route.useLoaderData()
  return (
    <>
      <h1>Types</h1>
      <ul className="type-grid">
        {types.map((type: { name: string; label: string }) => (
          <li key={type.name}>
            <Link to="/types/$name" params={{ name: type.name }} className={`type-${type.name}`}>
              {type.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
