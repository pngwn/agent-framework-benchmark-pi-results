import { createFileRoute } from '@tanstack/react-router'
import { fetchTypeList } from '~/server/functions'

export const Route = createFileRoute('/types/')({
  loader: () => fetchTypeList(),
  head: () => ({ meta: [{ title: 'Types – Pokédex' }] }),
  component: TypesPage,
})

function TypesPage() {
  const data = Route.useLoaderData()
  return (
    <>
      <h1 className="page-title">Types</h1>
      <ul className="types-grid">
        {data.types.map((type) => (
          <li key={type.name}>
            <a href={`/types/${type.name}`} data-type={type.name} className="type-badge-link" style={{ background: `var(--type-${type.name})` }}>
              {type.en}
            </a>
          </li>
        ))}
      </ul>
    </>
  )
}
