import { createFileRoute, Link } from '@tanstack/react-router'
import { Page } from '../components/Layout'
import { TypeBadge } from '../components/PokemonCard'
import { loadTypeListPage } from '../lib/queries'

export const Route = createFileRoute('/types/')({
  loader: async () => loadTypeListPage(),
  head: () => ({ meta: [{ title: 'Types – Pokédex' }] }),
  component: TypesPage,
})

function TypesPage() {
  const data = Route.useLoaderData()

  return (
    <Page>
      <main className="page types-page">
        <h1>Types</h1>
        <ul className="type-list type-list-page">
          {data.types.map((type) => (
            <li key={type.name}>
              <Link to="/types/$name" params={{ name: type.name }} className="type-link">
                <TypeBadge name={type.name} label={type.label} />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </Page>
  )
}
