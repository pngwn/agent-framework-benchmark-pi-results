import { Link, createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { getPokemonPage } from '../../lib/server'
import type { EvoNode } from '../../lib/data'
import { Section, TypeBadgeLink } from '../../lib/components'
import { MovesTable } from '../../lib/MovesTable'

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (search: Record<string, unknown>) => ({
    game: typeof search.game === 'string' && search.game !== '' ? search.game : undefined,
  }),
  loaderDeps: ({ search }) => ({ game: search.game }),
  loader: async ({ params, deps }) => {
    const data = await getPokemonPage({ data: { name: params.name, game: deps.game } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: PokemonPage,
})

function EvolutionNode({ node }: { node: EvoNode }) {
  return (
    <li>
      <Link to="/pokemon/$name" params={{ name: node.name }}>
        {node.label}
      </Link>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <EvolutionNode key={child.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  )
}

function PokemonPage() {
  const d = Route.useLoaderData()
  const navigate = useNavigate()

  // Make sure anchor navigation (e.g. #moves) lands on the target even if
  // client-side work shifted the scroll position.
  useEffect(() => {
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1))
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView())
        setTimeout(() => el.scrollIntoView(), 150)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changeGame = (game: string) => {
    navigate({
      to: '/pokemon/$name',
      params: { name: d.speciesName },
      search: { game },
      hash: 'moves',
    })
  }

  return (
    <>
      <div className="hero">
        <div className="artwork panel">
          {d.artwork && <img src={d.artwork} alt={d.title} width={288} height={288} />}
        </div>
        <div className="hero-summary">
          <p className="dex-number">{d.dex}</p>
          <h1>{d.title}</h1>
          {d.genus && <p className="genus">{d.genus}</p>}
          <p className="hero-types">
            {d.types.map((t) => (
              <TypeBadgeLink key={t.name} name={t.name} label={t.label} />
            ))}
          </p>
          <dl className="measurements">
            <div>
              <dt>Height</dt>
              <dd>{d.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{d.weight}</dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="flavor-text">{d.flavor}</p>

      <Section heading="Base stats" id="base-stats" className="stats-section">
        <table className="stats-table">
          <tbody>
            {d.stats.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td className="stat-value">{s.value}</td>
                <td className="stat-bar-cell">
                  <span className="stat-track">
                    <span
                      className="stat-bar"
                      style={{ width: `${Math.min(100, (s.value / 255) * 100)}%` }}
                    />
                  </span>
                </td>
              </tr>
            ))}
            <tr className="stat-total">
              <th scope="row">Total</th>
              <td className="stat-value">{d.total}</td>
              <td className="stat-bar-cell">
                <span className="stat-track">
                  <span
                    className="stat-bar"
                    style={{ width: `${Math.min(100, (d.total / 720) * 100)}%` }}
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section heading="Abilities" id="abilities">
        <ul className="plain-list">
          {d.abilities.map((a) => (
            <li key={a.name}>
              <Link to="/abilities/$name" params={{ name: a.name }}>
                {a.label}
              </Link>
              {a.hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      {d.evolution && (
        <Section heading="Evolution" id="evolution">
          <ul className="plain-list evolution-list">
            <EvolutionNode node={d.evolution} />
          </ul>
        </Section>
      )}

      <Section heading="Moves" id="moves" className="moves-section">
        <div className="field game-field">
          <label htmlFor="game">Game</label>
          <select
            id="game"
            value={d.moves.selectedGame}
            onChange={(e) => changeGame(e.target.value)}
          >
            {d.moves.games.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        {d.moves.methods.map((method) => (
          <MovesTable
            key={method.key}
            label={method.label}
            hasLevel={method.hasLevel}
            rows={method.rows}
          />
        ))}
      </Section>
    </>
  )
}
