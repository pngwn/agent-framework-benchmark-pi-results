import { useEffect } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { MovesSection } from '../components/MovesSection'
import { NotFound } from '../components/NotFound'
import { getPokemonData } from '../lib/data.functions'
import type { EvolutionNode } from '../lib/model'

interface PokemonSearch {
  game?: string
}

function validateSearch(search: Record<string, unknown>): PokemonSearch {
  return {
    game: typeof search.game === 'string' && search.game !== '' ? search.game : undefined,
  }
}

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch,
  loaderDeps: ({ search }) => ({ game: search.game }),
  loader: ({ params, deps }) => getPokemonData({ data: { name: params.name, game: deps.game } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.englishName ?? 'Not found'} – Pokédex` }],
  }),
  component: PokemonPage,
})

function EvolutionList({ nodes }: { nodes: EvolutionNode[] }) {
  return (
    <ul className="evolution-list">
      {nodes.map((node) => (
        <li key={node.name}>
          <Link to="/pokemon/$name" params={{ name: node.name }}>
            {node.label}
          </Link>
          {node.children.length > 0 && <EvolutionList nodes={node.children} />}
        </li>
      ))}
    </ul>
  )
}

function PokemonPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: '/pokemon/$name' })

  useEffect(() => {
    if (window.location.hash === '#moves') {
      const frame = requestAnimationFrame(() => {
        document.getElementById('moves')?.scrollIntoView()
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [])

  if (!data) return <NotFound />

  return (
    <main className="container page">
      <div className="pokemon-summary">
        <div className="artwork-card">
          {data.artwork && (
            <img src={data.artwork} alt={data.englishName} className="artwork" width={288} height={288} />
          )}
        </div>
        <div className="pokemon-summary-body">
          <span className="dex-number">{data.dexNumber}</span>
          <h1>{data.englishName}</h1>
          <p className="genus">{data.genus}</p>
          <div className="type-row">
            {data.types.map((type) => (
              <Link
                key={type.name}
                to="/types/$name"
                params={{ name: type.name }}
                className={`type-badge type-${type.name}`}
              >
                {type.label}
              </Link>
            ))}
          </div>
          <dl className="measurements">
            <div>
              <dt>Height</dt>
              <dd>{(data.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(data.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          <p className="flavor-text">{data.flavor}</p>
        </div>
      </div>

      <section aria-labelledby="stats-heading" className="panel">
        <h2 id="stats-heading">Base stats</h2>
        <table className="stats-table">
          <tbody>
            {data.stats.map((stat) => (
              <tr key={stat.label}>
                <th scope="row">{stat.label}</th>
                <td>
                  <span className="stat-number">{stat.value}</span>
                  <span className="stat-track" aria-hidden="true">
                    <span
                      className="stat-fill"
                      style={{ width: `${Math.min(100, (stat.value / 180) * 100)}%` }}
                    />
                  </span>
                </td>
              </tr>
            ))}
            <tr className="stat-total">
              <th scope="row">Total</th>
              <td>
                <span className="stat-number">{data.total}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section aria-labelledby="abilities-heading" className="panel">
        <h2 id="abilities-heading">Abilities</h2>
        <ul className="plain-list">
          {data.abilities.map((ability) => (
            <li key={ability.name}>
              <Link to="/abilities/$name" params={{ name: ability.name }}>
                {ability.label}
              </Link>
              {ability.hidden ? ' (hidden)' : ''}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="evolution-heading" className="panel">
        <h2 id="evolution-heading">Evolution</h2>
        {data.evolution ? <EvolutionList nodes={[data.evolution]} /> : <p>—</p>}
      </section>

      <MovesSection
        key={data.selectedGame}
        games={data.games}
        selectedGame={data.selectedGame}
        moveTables={data.moveTables}
        onGameChange={(game) => {
          void navigate({
            search: (previous) => ({ ...previous, game }),
            hash: 'moves',
          })
        }}
      />
    </main>
  )
}
