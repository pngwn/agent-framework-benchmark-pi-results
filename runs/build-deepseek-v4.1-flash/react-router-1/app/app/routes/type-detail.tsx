import { Link } from 'react-router';
import { NotFoundPage, PokemonGrid, Section } from '../components';
import { getTypePage } from '../lib/api.server';

export async function loader({ params }: any) {
  const data = await getTypePage(params.name);
  return data ?? { notFound: true as const };
}

export function meta({ loaderData }: any) {
  return [
    {
      title: loaderData?.notFound
        ? 'Not found – Pokédex'
        : `${loaderData.displayName} – Pokédex`,
    },
  ];
}

export default function TypePage({ loaderData }: any) {
  const data = loaderData;
  if (data.notFound) return <NotFoundPage />;

  return (
    <>
      <h1>{data.displayName}</h1>
      <Section id="damage-relations" title="Damage relations">
        <dl className="relations-list">
          {data.relations.map((relation: any) => (
            <div key={relation.term}>
              <dt>{relation.term}</dt>
              <dd>
                {relation.types.length
                  ? relation.types.map((type: any) => (
                      <Link
                        key={type.name}
                        className={`type-badge type-${type.name}`}
                        to={`/types/${type.name}`}
                      >
                        {type.english}
                      </Link>
                    ))
                  : 'None'}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="result-count">{data.cards.length} Pokémon</p>
        <PokemonGrid cards={data.cards} />
      </Section>

      <Section id="moves" title="Moves">
        <p className="result-count">{data.moves.length} moves</p>
        <ul className="move-links">
          {data.moves.map((move: any) => (
            <li key={move.name}>
              <Link to={`/moves/${move.name}`}>{move.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
