import { Link, createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { getTypeListData } from '~/lib/server'

export const Route = createFileRoute('/types/')({
  loader: () => getTypeListData(),
  head: () => ({ meta: [{ title: 'Types – Pokédex' }] }),
  component: TypeListPage,
})

function TypeListPage() {
  const data = Route.useLoaderData()
  return (
    <>
      <h1>Types</h1>
      <ul className="type-list">
        {data.types.map((t) => (
          <li key={t.name}>
            <Link
              to="/types/$name"
              params={{ name: t.name }}
              className="type-tile"
              data-type={t.name}
            >
              {t.englishName}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
