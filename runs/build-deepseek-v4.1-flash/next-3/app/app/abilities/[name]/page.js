import NotFound from '../../../components/NotFound';
import PokemonCard from '../../../components/PokemonCard';
import { englishName, getAbility, getAbilityPageData, humanize } from '../../../lib/pokeapi';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { name } = await params;
  const ability = await getAbility(decodeURIComponent(name));
  if (!ability) return { title: 'Not found – Pokédex' };
  const title = englishName(ability.names) || humanize(ability.name);
  return { title: `${title} – Pokédex` };
}

export default async function AbilityPage({ params }) {
  const { name } = await params;
  const data = await getAbilityPageData(decodeURIComponent(name));
  if (!data) return <NotFound />;

  return (
    <>
      <h1>{data.englishName}</h1>

      <section className="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{data.effect}</p>
      </section>

      <section className="panel" aria-labelledby="ability-pokemon-heading">
        <h2 id="ability-pokemon-heading">Pokémon</h2>
        <p className="result-count">{data.pokemon.length} Pokémon</p>
        <ul className="pokemon-grid">
          {data.pokemon.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon} hidden={pokemon.hidden} />
          ))}
        </ul>
      </section>
    </>
  );
}
