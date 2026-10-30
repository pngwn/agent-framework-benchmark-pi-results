import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getPokemonPage } from '../server/functions'
import { dexNumber, humanize, pageTitle } from '../lib/format'
import type { EvolutionNode } from '../lib/types'
import { Section } from '../components/Section'
import { TypeBadge } from '../components/TypeBadge'
import { MoveTable } from '../components/MoveTable'
import { NotFound } from '../components/NotFound'
import { useTeam } from '../lib/team-context'

const MAX_STAT = 255

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (search: Record<string, unknown>): { game?: string } => ({
    game: typeof search.game === 'string' && search.game ? search.game : undefined,
  }),
  loaderDeps: ({ search }) => ({ game: search.game }),
  loader: async ({ params, deps }) => {
    const data = await getPokemonPage({ data: { name: params.name, game: deps.game } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  component: PokemonPage,
  notFoundComponent: NotFound,
})

function Evolution({ node }: { node: EvolutionNode }) {
  return (
    <li>
      <Link to="/pokemon/$name" params={{ name: node.name }}>
        {humanize(node.name)}
      </Link>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <Evolution key={child.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  )
}

function StatBar({ value, max }: { value: number; max: number }) {
  return (
    <span className="stat-bar" aria-hidden="true">
      <span className="stat-bar-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </span>
  )
}

function PokemonPage() {
  const p = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const team = useTeam()
  const inTeam = team.has(p.name)
  const total = p.stats.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className="page">
      <div className="summary">
        <div className="artwork">
          {p.artwork && <img src={p.artwork} alt={p.label} width={475} height={475} />}
        </div>
        <div className="summary-text">
          <p className="dex-number">{dexNumber(p.id)}</p>
          <h1>{p.label}</h1>
          <div className="team-actions">
            {inTeam ? (
              <button type="button" className="team-button" onClick={() => team.remove(p.name)}>
                Remove from team
              </button>
            ) : (
              <button
                type="button"
                className="team-button"
                onClick={() => team.add(p.name)}
                disabled={team.isFull}
              >
                Add to team
              </button>
            )}
            {!inTeam && team.isFull && <span className="team-note">Team is full</span>}
          </div>
          {p.genus && <p className="genus">{p.genus}</p>}
          <p className="badge-row">
            {p.types.map((t) => (
              <TypeBadge key={t.name} type={t} />
            ))}
          </p>
          <dl className="facts facts-inline">
            <div>
              <dt>Height</dt>
              <dd>{(p.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(p.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          {p.flavor && <p className="flavor">{p.flavor}</p>}
        </div>
      </div>

      <Section title="Base stats">
        <table className="stats-table">
          <tbody>
            {p.stats.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.label}</th>
                <td>{s.value}</td>
                <td className="stat-bar-cell">
                  <StatBar value={s.value} max={MAX_STAT} />
                </td>
              </tr>
            ))}
            <tr className="stats-total">
              <th scope="row">Total</th>
              <td>{total}</td>
              <td className="stat-bar-cell">
                <StatBar value={total} max={MAX_STAT * Math.max(1, p.stats.length)} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul className="plain-list">
          {p.abilities.map((a) => (
            <li key={a.name}>
              <Link to="/abilities/$name" params={{ name: a.name }}>
                {humanize(a.name)}
              </Link>
              {a.hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evolution">
        <ul className="evolution">
          <Evolution node={p.evolution} />
        </ul>
      </Section>

      <Section title="Moves" id="moves">
        {p.games.length === 0 ? (
          <p>This Pokémon learns no moves.</p>
        ) : (
          <>
            <div className="field field-inline">
              <label htmlFor="game">Game</label>
              <select
                id="game"
                value={search.game && p.games.some((g) => g.name === search.game) ? search.game : (p.game ?? '')}
                onChange={(e) =>
                  navigate({
                    search: (prev) => ({ ...prev, game: e.target.value }),
                    hash: (prev) => prev ?? '',
                    replace: true,
                    resetScroll: false,
                  })
                }
              >
                {p.games.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            {p.tables.map((table) => (
              <MoveTable key={`${p.game}-${table.method}`} table={table} />
            ))}
          </>
        )}
      </Section>
    </div>
  )
}
