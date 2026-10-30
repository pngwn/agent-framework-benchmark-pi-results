import Link from 'next/link';
import NotFound from '../../../components/NotFound';
import PokemonCard from '../../../components/PokemonCard';
import { englishName, getType, getTypePageData, humanize } from '../../../lib/pokeapi';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { name } = await params;
  const type = await getType(decodeURIComponent(name));
  if (!type || ['stellar', 'unknown', 'shadow'].includes(type.name)) {
    return { title: 'Not found – Pokédex' };
  }
  const title = englishName(type.names) || humanize(type.name);
  return { title: `${title} – Pokédex` };
}

export default async function TypePage({ params }) {
  const { name } = await params;
  const data = await getTypePageData(decodeURIComponent(name));
  if (!data) return <NotFound />;

  return (
    <>
      <h1>{data.englishName}</h1>

      <section className="panel" aria-labelledby="damage-heading">
        <h2 id="damage-heading">Damage relations</h2>
        <dl className="damage-relations">
          {data.damageRelations.map((relation) => (
            <div key={relation.label}>
              <dt>{relation.label}</dt>
              <dd>
                {relation.types.length
                  ? relation.types.map((type) => (
                      <Link
                        key={type.name}
                        href={`/types/${type.name}`}
                        className={`type-pill type-${type.name}`}
                      >
                        {type.englishName}
                      </Link>
                    ))
                  : 'None'}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel" aria-labelledby="type-pokemon-heading">
        <h2 id="type-pokemon-heading">Pokémon</h2>
        <p className="result-count">{data.pokemon.length} Pokémon</p>
        <ul className="pokemon-grid">
          {data.pokemon.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon} />
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="type-moves-heading">
        <h2 id="type-moves-heading">Moves</h2>
        <p className="result-count">{data.moves.length} moves</p>
        <ul className="move-link-grid">
          {data.moves.map((move) => (
            <li key={move.name}>
              <Link href={`/moves/${move.name}`}>{move.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
