import { useEffect } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { getPokemonData } from '../../server/data'
import { Section } from '../../components/Section'
import { MovesTable } from '../../components/MovesTable'
import { NotFound } from '../../components/NotFound'
import { TypeBadgeLink } from '../../components/TypeBadge'
import { dexNumber, humanize } from '../../lib/format'

interface PokemonSearch {
  game?: string
}

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (search: Record<string, unknown>): PokemonSearch => ({
    game: typeof search.game === 'string' && search.game ? search.game : undefined,
  }),
  loader: ({ params }) => getPokemonData({ data: params.name }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: PokemonPage,
})

const METHOD_LABEL = (method: string) => humanize(method)

function EvolutionNode({ node }: { node: any }) {
  return (
    <li>
      <Link to="/pokemon/$name" params={{ name: node.name }}>
        {node.display}
      </Link>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child: any) => (
            <EvolutionNode key={child.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  )
}

function PokemonPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const params = Route.useParams()
  const navigate = useNavigate()

  // Support /pokemon/:name#moves even if native anchor scrolling is interrupted.
  useEffect(() => {
    if (window.location.hash === '#moves') {
      document.getElementById('moves')?.scrollIntoView()
    }
  }, [])

  if (!data) return <NotFound />

  const gameNames = new Set(data.games.map((g) => g.name))
  const defaultGame = data.games[data.games.length - 1]?.name
  const selectedGame =
    search.game && gameNames.has(search.game) ? search.game : defaultGame
  const methods = (selectedGame && data.movesByGame[selectedGame]) || {}
  const methodNames = Object.keys(methods)

  return (
    <>
      <div className="pokemon-summary">
        <div className="pokemon-artwork">
          {data.artwork && <img src={data.artwork} alt={data.title} />}
        </div>
        <div className="pokemon-info">
          <p className="dex-number">{dexNumber(data.id)}</p>
          <h1>{data.title}</h1>
          {data.genus && <p className="genus">{data.genus}</p>}
          <p className="pokemon-types">
            {data.types.map((t) => (
              <TypeBadgeLink key={t.name} name={t.name} display={t.display} />
            ))}
          </p>
          <dl className="facts">
            <div className="fact">
              <dt>Height</dt>
              <dd>{data.height ?? '—'}</dd>
            </div>
            <div className="fact">
              <dt>Weight</dt>
              <dd>{data.weight ?? '—'}</dd>
            </div>
          </dl>
          {data.flavor && <p className="flavor">{data.flavor}</p>}
        </div>
      </div>

      <Section name="Base stats">
        <table className="stats-table">
          <tbody>
            {data.stats.map((stat) => (
              <tr key={stat.label}>
                <th scope="row">{stat.label}</th>
                <td className="stat-value">{stat.value}</td>
                <td className="stat-bar-cell">
                  <span className="stat-track">
                    <span
                      className="stat-bar"
                      style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }}
                    />
                  </span>
                </td>
              </tr>
            ))}
            <tr className="stat-total">
              <th scope="row">Total</th>
              <td className="stat-value">{data.statsTotal}</td>
              <td className="stat-bar-cell">
                <span className="stat-track">
                  <span
                    className="stat-bar"
                    style={{ width: `${Math.min(100, (data.statsTotal / 720) * 100)}%` }}
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section name="Abilities">
        <ul className="plain-list">
          {data.abilities.map((ability) => (
            <li key={ability.name}>
              <Link to="/abilities/$name" params={{ name: ability.name }}>
                {ability.display}
              </Link>
              {ability.hidden ? ' (hidden)' : ''}
            </li>
          ))}
        </ul>
      </Section>

      <Section name="Evolution">
        {data.evolution && (
          <ul className="evolution-list">
            <EvolutionNode node={data.evolution} />
          </ul>
        )}
      </Section>

      <section className="section" id="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading" className="section-heading">
          Moves
        </h2>
        {data.games.length > 0 && (
          <div className="field game-field">
            <label htmlFor="game">Game</label>
            <select
              id="game"
              value={selectedGame}
              onChange={(event) =>
                navigate({
                  to: '/pokemon/$name',
                  params: { name: params.name },
                  search: { game: event.target.value },
                  hash: 'moves',
                })
              }
            >
              {data.games.map((game) => (
                <option key={game.name} value={game.name}>
                  {game.display}
                </option>
              ))}
            </select>
          </div>
        )}
        {methodNames.map((method) => (
          <MovesTable
            key={method}
            caption={METHOD_LABEL(method)}
            rows={methods[method]}
            showLevel={method === 'level-up'}
          />
        ))}
      </section>
    </>
  )
}
