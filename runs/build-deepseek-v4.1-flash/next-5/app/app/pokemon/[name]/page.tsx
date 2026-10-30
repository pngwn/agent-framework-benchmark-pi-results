import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MovesSection from '../../components/MovesSection';
import {
  getPokemonPageData,
  getSpeciesRecord,
  isNotFound,
} from '../../lib/data';
import { englishName, EvolutionNode, NameInfo } from '../../lib/models';

export const dynamic = 'force-dynamic';

interface PokemonPageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: PokemonPageProps): Promise<Metadata> {
  const { name } = await params;
  const species = await getSpeciesRecord(name);
  return { title: species ? englishName(species.names as NameInfo[], species.name) : 'Not found' };
}

function EvolutionBranch({ node }: { node: EvolutionNode }) {
  return (
    <li>
      <Link href={`/pokemon/${node.species.name}`}>
        {node.species.name
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')}
      </Link>
      {node.evolves_to.length > 0 ? (
        <ul>
          {node.evolves_to.map((child) => (
            <EvolutionBranch key={child.species.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default async function PokemonPage({ params, searchParams }: PokemonPageProps) {
  const { name } = await params;
  const query = await searchParams;
  const data = await getPokemonPageData(name, first(query.game));

  if (isNotFound(data)) notFound();

  return (
    <main className="shell page">
      <article className="pokemon-summary">
        <div className="summary-art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.artwork} alt={data.englishName} width={288} height={288} />
        </div>
        <div className="summary-body">
          <p className="dex-number">{data.dex}</p>
          <h1>{data.englishName}</h1>
          <p className="genus">{data.genus}</p>
          <div className="summary-types">
            <span className="type-badges">
              {data.types.map((type) => (
                <Link key={type.name} href={`/types/${type.name}`} className={`type-badge type-${type.name}`}>
                  {type.label}
                </Link>
              ))}
            </span>
          </div>
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{data.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{data.weight}</dd>
            </div>
          </dl>
          <p className="flavor">{data.flavor}</p>
        </div>
      </article>

      <section className="panel" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table className="stats-table">
          <tbody>
            {data.stats.map((stat) => (
              <tr key={stat.key}>
                <th scope="row">{stat.label}</th>
                <td>
                  <span className="stat-cell">
                    <span className="stat-value">{stat.value}</span>
                    <span className="stat-bar-track" aria-hidden="true">
                      <span
                        className="stat-bar"
                        style={{ width: `${Math.min(100, Math.round((stat.value / 255) * 100))}%` }}
                      />
                    </span>
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td>
                <span className="stat-cell">
                  <span className="stat-value">{data.statTotal}</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="panel" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul className="plain-list">
          {data.abilities.map((ability) => (
            <li key={`${ability.name}-${ability.hidden ? 'hidden' : 'normal'}`}>
              <Link href={`/abilities/${ability.name}`}>{ability.label}</Link>
              {ability.hidden ? ' (hidden)' : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        {data.evolution ? (
          <ul className="evolution-tree">
            <EvolutionBranch node={data.evolution} />
          </ul>
        ) : null}
      </section>

      <section className="panel" id="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <MovesSection games={data.games} initialGame={data.initialGame} />
      </section>
    </main>
  );
}
