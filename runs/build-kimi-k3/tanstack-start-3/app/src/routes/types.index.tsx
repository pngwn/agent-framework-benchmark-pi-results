import { Link, createFileRoute } from '@tanstack/react-router'
import { fetchTypeList } from '../server/fns'

export const Route = createFileRoute('/types/')({
  staleTime: Infinity,
  loader: () => fetchTypeList(),
  head: () => ({ meta: [{ title: 'Types – Pokédex' }] }),
  component: TypesPage,
})

function TypesPage() {
  const types = Route.useLoaderData()
  return (
    <>
      <h1>Types</h1>
      <ul className="types-grid">
        {types.map((t: any) => (
          <li key={t.name}>
            <Link
              to="/types/$name"
              params={{ name: t.name }}
              className="type-tile"
              style={{ backgroundColor: `var(--type-${t.name}, var(--color-text-muted))` }}
            >
              {t.englishName}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
