import { createFileRoute } from '@tanstack/react-router'
import { MovesSection } from '~/components/MovesSection'
import { NotFound } from '~/components/NotFound'
import { TypeBadge } from '~/components/TypeBadge'
import { dexNumber, humanize } from '~/lib/format'
import { fetchPokemonPage } from '~/server/functions'

type PokemonSearch = { game?: string }

export const Route = createFileRoute('/pokemon/$name')({
  validateSearch: (search: Record<string, unknown>): PokemonSearch => ({
    game: typeof search.game === 'string' && search.game !== '' ? search.game : undefined,
  }),
  loaderDeps: ({ search }) => ({ game: search.game }),
  loader: ({ params, deps }) => fetchPokemonPage({ data: { name: params.name, game: deps.game } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.name} – Pokédex` : 'Not found – Pokédex' }],
  }),
  component: PokemonPage,
})

type ChainLink = { name: string; children: ChainLink[] }

function EvolutionNode({ node }: { node: ChainLink }) {
  return (
    <li>
      <a href={`/pokemon/${node.name}`}>{humanize(node.name)}</a>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <EvolutionNode key={child.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function PokemonPage() {
  const data = Route.useLoaderData()
  if (!data) return <NotFound />

  return (
    <>
      <div className="section-card pokemon-summary">
        <img className="artwork" src={data.artwork} alt={data.name} width={288} height={288} />
        <span className="dex">{dexNumber(data.id)}</span>
        <h1>{data.name}</h1>
        <p className="genus">{data.genus}</p>
        <p className="type-list-badges">
          {data.types.map((t) => (
            <TypeBadge key={t.name} name={t.name} label={t.en} link />
          ))}
        </p>
        <dl className="facts">
          <div>
            <dt>Height</dt>
            <dd>{data.height} m</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{data.weight} kg</dd>
          </div>
        </dl>
        <p className="flavor-text">{data.flavorText}</p>
      </div>

      <section className="section-card" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table className="stats-table">
          <tbody>
            {data.stats.map((stat: { label: string; value: number }) => (
              <tr key={stat.label}>
                <th scope="row">{stat.label}</th>
                <td className="stat-value">{stat.value}</td>
                <td>
                  <div className="stat-track">
                    <div
                      className="stat-bar"
                      style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td className="stat-value">{data.statTotal}</td>
              <td>
                <div className="stat-track">
                  <div
                    className="stat-bar"
                    style={{ width: `${Math.min(100, (data.statTotal / (255 * 6)) * 100)}%` }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="section-card" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul className="link-list">
          {data.abilities.map((ability) => (
            <li key={ability.name}>
              <a href={`/abilities/${ability.name}`}>{humanize(ability.name)}</a>
              {ability.isHidden ? ' (hidden)' : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="section-card" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        {data.evolution ? (
          <ul className="link-list">
            <EvolutionNode node={data.evolution} />
          </ul>
        ) : null}
      </section>

      <MovesSection
        speciesName={data.speciesName}
        games={data.games}
        selectedGame={data.selectedGame}
        methods={data.methods}
      />
    </>
  )
}
