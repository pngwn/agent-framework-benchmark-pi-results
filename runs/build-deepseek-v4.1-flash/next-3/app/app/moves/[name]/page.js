import NotFound from '../../../components/NotFound';
import PokemonCard from '../../../components/PokemonCard';
import { TypePill } from '../../../components/TypePill';
import { englishName, getMove, getMovePageData, humanize } from '../../../lib/pokeapi';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { name } = await params;
  const move = await getMove(decodeURIComponent(name));
  if (!move) return { title: 'Not found – Pokédex' };
  const title = englishName(move.names) || humanize(move.name);
  return { title: `${title} – Pokédex` };
}

function valueOrDash(value) {
  return value === null || value === undefined ? '—' : value;
}

export default async function MovePage({ params }) {
  const { name } = await params;
  const data = await getMovePageData(decodeURIComponent(name));
  if (!data) return <NotFound />;

  const { move } = data;
  return (
    <>
      <h1>{data.englishName}</h1>
      <dl className="detail-list">
        <div>
          <dt>Type</dt>
          <dd>
            <TypePill
              name={move.type?.name}
              englishName={humanize(move.type?.name)}
              href={`/types/${move.type?.name}`}
            />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{humanize(move.damage_class?.name)}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{valueOrDash(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{valueOrDash(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{valueOrDash(move.pp)}</dd>
        </div>
      </dl>

      <section className="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{data.effect}</p>
      </section>

      <section className="panel" aria-labelledby="learned-heading">
        <h2 id="learned-heading">Learned by</h2>
        <p className="result-count">{data.learnedBy.length} Pokémon</p>
        <ul className="pokemon-grid">
          {data.learnedBy.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon} />
          ))}
        </ul>
      </section>
    </>
  );
}
