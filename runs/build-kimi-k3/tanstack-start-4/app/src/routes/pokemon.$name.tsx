import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { Section, TypeBadge } from '~/lib/components'
import { MovesTable } from '~/lib/MovesTable'
import { getPokemonPageData } from '~/lib/server'

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (search: Record<string, unknown>) => ({
    game: typeof search.game === 'string' && search.game ? search.game : undefined,
  }),
  loaderDeps: ({ search }) => ({ game: search.game ?? '' }),
  loader: ({ params, deps }) =>
    getPokemonPageData({ data: { name: params.name, game: deps.game || undefined } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? 'Not found'} – Pokédex` }],
  }),
  component: PokemonPage,
})

interface EvoNode {
  name: string
  humanName: string
  evolvesTo: EvoNode[]
}

function EvolutionNode({ node }: { node: EvoNode }) {
  return (
    <li>
      <Link to="/pokemon/$name" params={{ name: node.name }}>
        {node.humanName}
      </Link>
      {node.evolvesTo.length > 0 ? (
        <ul>
          {node.evolvesTo.map((child) => (
            <EvolutionNode key={child.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

const STAT_BAR_MAX = 255

function PokemonPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <>
      <div className="pokemon-summary">
        <div className="pokemon-artwork">
          {data.artwork ? <img src={data.artwork} alt={data.title} /> : null}
        </div>
        <div className="pokemon-info">
          <p className="pokemon-dex">{data.dex}</p>
          <h1>{data.title}</h1>
          {data.genus ? <p className="pokemon-genus">{data.genus}</p> : null}
          <p className="pokemon-types">
            {data.types.map((t) => (
              <TypeBadge key={t.name} name={t.name} label={t.englishName} />
            ))}
          </p>
          <dl className="fact-list">
            <div className="fact">
              <dt>Height</dt>
              <dd>{data.height !== null ? `${(data.height / 10).toFixed(1)} m` : '—'}</dd>
            </div>
            <div className="fact">
              <dt>Weight</dt>
              <dd>{data.weight !== null ? `${(data.weight / 10).toFixed(1)} kg` : '—'}</dd>
            </div>
          </dl>
          {data.flavor ? <p className="pokemon-flavor">{data.flavor}</p> : null}
        </div>
      </div>

      <Section title="Base stats" headingId="stats-heading">
        <table className="stats-table">
          <tbody>
            {data.stats.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td className="stat-value">{s.value}</td>
                <td className="stat-bar" aria-hidden="true">
                  <div className="stat-track">
                    <div
                      className="stat-fill"
                      style={{ width: `${Math.min(100, (s.value / STAT_BAR_MAX) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr className="stats-total">
              <th scope="row">Total</th>
              <td className="stat-value">{data.statsTotal}</td>
              <td className="stat-bar" aria-hidden="true">
                <div className="stat-track">
                  <div
                    className="stat-fill"
                    style={{
                      width: `${Math.min(100, (data.statsTotal / (STAT_BAR_MAX * data.stats.length || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities" headingId="abilities-heading">
        <ul className="plain-list">
          {data.abilities.map((a) => (
            <li key={a.name}>
              <Link to="/abilities/$name" params={{ name: a.name }}>
                {a.humanName}
              </Link>
              {a.isHidden ? ' (hidden)' : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evolution" headingId="evolution-heading">
        <ul className="evo-tree">
          <EvolutionNode node={data.evolution} />
        </ul>
      </Section>

      <Section title="Moves" headingId="moves-heading" id="moves">
        {data.games.length > 0 ? (
          <div className="field game-field">
            <label htmlFor="game">Game</label>
            <select
              id="game"
              value={data.selectedGame ?? ''}
              onChange={(e) =>
                navigate({
                  to: '.',
                  search: e.target.value ? { game: e.target.value } : {},
                  replace: true,
                })
              }
            >
              {data.games.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {data.tables.map((table) => (
          <MovesTable key={`${data.selectedGame}-${table.method}`} table={table} />
        ))}
      </Section>
    </>
  )
}
