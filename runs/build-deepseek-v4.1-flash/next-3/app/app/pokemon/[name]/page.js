import Link from 'next/link';
import GameSelect from '../../../components/GameSelect';
import NotFound from '../../../components/NotFound';
import SortableMoveTable from '../../../components/SortableMoveTable';
import { TypePill } from '../../../components/TypePill';
import {
  englishName,
  getPokemonPageData,
  getSpecies,
  humanize,
  mediaUrl,
} from '../../../lib/pokeapi';

export const dynamic = 'force-dynamic';

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const species = await getSpecies(decodeURIComponent(name));
  if (!species) return { title: 'Not found – Pokédex' };
  const title = englishName(species.names) || humanize(species.name);
  return { title: `${title} – Pokédex` };
}

function EvolutionNode({ node }) {
  return (
    <li>
      <Link href={`/pokemon/${node.speciesName}`}>{humanize(node.speciesName)}</Link>
      {node.evolvesTo?.length ? (
        <ul>
          {node.evolvesTo.map((child) => (
            <EvolutionNode key={child.speciesName} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function formatMetric(value, unit) {
  if (value === null || value === undefined) return '—';
  return `${(value / 10).toFixed(1)} ${unit}`;
}

export default async function PokemonPage({ params, searchParams }) {
  const { name } = await params;
  const query = await searchParams;
  const requestedGame = first(query.game);
  const data = await getPokemonPageData(decodeURIComponent(name), requestedGame);

  if (!data) return <NotFound />;

  const { species, pokemon } = data;
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ||
    pokemon.sprites?.other?.home?.front_default ||
    pokemon.sprites?.front_default;
  const totalStats = data.stats.reduce((sum, stat) => sum + (stat.value || 0), 0);
  const maxBar = 255;

  return (
    <>
      <article className="pokemon-summary">
        <div className="artwork-wrap">
          {artwork ? (
            <img className="artwork" src={mediaUrl(artwork)} alt={data.englishName} />
          ) : null}
        </div>
        <div className="summary-content">
          <p className="dex-number">#{String(species.id).padStart(4, '0')}</p>
          <h1>{data.englishName}</h1>
          {data.genus ? <p className="genus">{data.genus}</p> : null}
          <div className="type-row">
            {data.types.map((type) => (
              <TypePill
                key={type.name}
                name={type.name}
                englishName={type.englishName}
                href={`/types/${type.name}`}
              />
            ))}
          </div>
          <dl className="measurements">
            <div>
              <dt>Height</dt>
              <dd>{formatMetric(pokemon.height, 'm')}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{formatMetric(pokemon.weight, 'kg')}</dd>
            </div>
          </dl>
          {data.flavorText ? <p className="flavor-text">{data.flavorText}</p> : null}
        </div>
      </article>

      <section className="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <div className="table-wrap">
          <table className="stats-table">
            <tbody>
              {data.stats.map((stat) => (
                <tr key={stat.name}>
                  <th scope="row">{stat.label}</th>
                  <td>{stat.value}</td>
                  <td aria-hidden="true">
                    <span className="stat-track">
                      <span
                        className="stat-bar"
                        style={{ width: `${Math.min(100, ((stat.value || 0) / maxBar) * 100)}%` }}
                      />
                    </span>
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row">Total</th>
                <td>{totalStats}</td>
                <td aria-hidden="true">
                  <span className="stat-track">
                    <span
                      className="stat-bar"
                      style={{ width: `${Math.min(100, (totalStats / (maxBar * 6)) * 100)}%` }}
                    />
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul className="link-list">
          {data.abilities.map((ability) => (
            <li key={`${ability.name}-${ability.slot ?? ''}`}>
              <Link href={`/abilities/${ability.name}`}>{ability.label}</Link>
              {ability.hidden ? ' (hidden)' : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        {data.evolution ? (
          <ul className="evolution-list">
            <EvolutionNode node={data.evolution} />
          </ul>
        ) : null}
      </section>

      <section id="moves" className="panel moves-panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        {data.games.length ? (
          <GameSelect games={data.games} selected={data.selectedGame ?? ''} />
        ) : null}
        {data.moveTables.map((table) => (
          <SortableMoveTable
            key={table.name}
            caption={table.label}
            rows={table.rows}
            hasLevel={table.name === 'level-up'}
          />
        ))}
      </section>
    </>
  );
}
