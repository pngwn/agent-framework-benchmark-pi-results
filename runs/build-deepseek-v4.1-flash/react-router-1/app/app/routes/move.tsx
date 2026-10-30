import { Link } from 'react-router';
import { NotFoundPage, PokemonGrid, Section } from '../components';
import { getMovePage } from '../lib/api.server';

export async function loader({ params }: any) {
  const data = await getMovePage(params.name);
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

export default function MovePage({ loaderData }: any) {
  const data = loaderData;
  if (data.notFound) return <NotFoundPage />;

  return (
    <>
      <h1>{data.displayName}</h1>
      <dl className="details-list">
        <div>
          <dt>Type</dt>
          <dd>
            <Link
              className={`type-badge type-${data.type.name}`}
              to={`/types/${data.type.name}`}
            >
              {data.type.english}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{data.category}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{data.power}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{data.accuracy}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{data.pp}</dd>
        </div>
      </dl>

      <Section id="effect" title="Effect">
        <p>{data.effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="result-count">{data.cards.length} Pokémon</p>
        <PokemonGrid cards={data.cards} />
      </Section>
    </>
  );
}
