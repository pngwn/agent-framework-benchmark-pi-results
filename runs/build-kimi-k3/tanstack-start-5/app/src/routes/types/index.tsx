import { Link, createFileRoute } from '@tanstack/react-router'
import { getTypeList } from '../../lib/server'

export const Route = createFileRoute('/types/')({
  staleTime: Infinity,
  loader: () => getTypeList(),
  head: () => ({ meta: [{ title: 'Types – Pokédex' }] }),
  component: TypesPage,
})

function TypesPage() {
  const types = Route.useLoaderData()
  return (
    <>
      <h1>Types</h1>
      <ul className="type-list">
        {types.map((t) => (
          <li key={t.name}>
            <Link to="/types/$name" params={{ name: t.name }} className={`type-tile type-${t.name}`}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
