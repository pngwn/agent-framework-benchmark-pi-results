import { createFileRoute, Link } from '@tanstack/react-router'
import { NotFoundPage, Page } from '../components/Layout'
import { MoveTable } from '../components/MoveTable'
import { TypeBadge } from '../components/PokemonCard'
import type { EvolutionNode } from '../lib/data.server'
import { loadPokemonPage } from '../lib/queries'

type PokemonSearch = { game?: string }

function validateSearch(search: Record<string, unknown>): PokemonSearch {
  return typeof search.game === 'string' && search.game !== '' ? { game: search.game } : {}
}

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch,
  loaderDeps: ({ search }) => ({ game: search.game ?? '' }),
  loader: async ({ params, deps }) =>
    loadPokemonPage({ data: { name: params.name, game: deps.game } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.notFound ? 'Not found – Pokédex' : `${loaderData?.name ?? ''} – Pokédex`,
      },
    ],
  }),
  component: PokemonPage,
})

function EvolutionItem({ node }: { node: EvolutionNode }) {
  return (
    <li>
      <Link to="/pokemon/$name" params={{ name: node.speciesName }}>
        {node.label}
      </Link>
      {node.evolvesTo.length > 0 ? (
        <ul>
          {node.evolvesTo.map((child) => (
            <EvolutionItem key={child.speciesName} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function PokemonPage() {
  const data = Route.useLoaderData()
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  if (data.notFound) return <NotFoundPage />

  return (
    <Page>
      <main className="page pokemon-page">
        <div className="pokemon-summary">
          <div className="artwork-wrap">
            {data.artwork ? (
              <img className="artwork" src={data.artwork} alt={data.name} />
            ) : null}
          </div>

          <div className="summary-body">
            <p className="summary-dex">{data.dex}</p>
            <h1 id="pokemon-heading">{data.name}</h1>
            <p className="genus">{data.genus}</p>

            <ul className="type-list" aria-label="Types">
              {data.types.map((type) => (
                <li key={type.name}>
                  <Link to="/types/$name" params={{ name: type.name }} className="type-link">
                    <TypeBadge name={type.name} label={type.label} />
                  </Link>
                </li>
              ))}
            </ul>

            <dl className="summary-facts">
              <div>
                <dt>Height</dt>
                <dd>{data.height}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{data.weight}</dd>
              </div>
            </dl>

            {data.flavor ? <p className="flavor">{data.flavor}</p> : null}
          </div>
        </div>

        <section className="panel" aria-labelledby="stats-heading">
          <h2 id="stats-heading">Base stats</h2>
          <table className="stats-table">
            <tbody>
              {data.stats.map((stat) => (
                <tr key={stat.label}>
                  <th scope="row">{stat.label}</th>
                  <td className="stat-value">{stat.value}</td>
                  <td className="stat-bar-cell" aria-hidden="true">
                    <span
                      className="stat-bar"
                      style={{ width: `${Math.min(100, (stat.value / 180) * 100)}%` }}
                    />
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row">Total</th>
                <td className="stat-value">{data.statTotal}</td>
                <td className="stat-bar-cell" aria-hidden="true" />
              </tr>
            </tbody>
          </table>
        </section>

        <section className="panel" aria-labelledby="abilities-heading">
          <h2 id="abilities-heading">Abilities</h2>
          <ul className="plain-list">
            {data.abilities.map((ability) => (
              <li key={ability.name}>
                <Link to="/abilities/$name" params={{ name: ability.name }}>
                  {ability.label}
                </Link>
                {ability.hidden ? ' (hidden)' : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" aria-labelledby="evolution-heading">
          <h2 id="evolution-heading">Evolution</h2>
          <ul className="evolution-list">
            <EvolutionItem node={data.evolution} />
          </ul>
        </section>

        <section id="moves" className="panel moves-section" aria-labelledby="moves-heading">
          <h2 id="moves-heading">Moves</h2>

          <div className="game-picker">
            <label htmlFor="game-select">Game</label>
            <select
              id="game-select"
              value={data.selectedGame}
              onChange={(event) => {
                void navigate({
                  to: '/pokemon/$name',
                  params: { name: params.name },
                  search: { game: event.target.value },
                })
              }}
            >
              {data.games.map((game) => (
                <option key={game.name} value={game.name}>
                  {game.label}
                </option>
              ))}
            </select>
          </div>

          {data.tables.map((table) => (
            <MoveTable
              key={`${search.game ?? data.selectedGame}-${table.method}`}
              table={table}
            />
          ))}
        </section>
      </main>
    </Page>
  )
}
