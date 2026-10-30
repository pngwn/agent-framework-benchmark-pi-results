import Link from 'next/link';
import { humanize, spriteUrl } from '../lib/pokeapi';

export default function PokemonCard({ pokemon, showTypes = false, hidden = false }) {
  const speciesName = pokemon.speciesName || pokemon.name;
  const name = pokemon.humanizedName || humanize(speciesName);
  return (
    <li className="pokemon-card">
      <Link href={`/pokemon/${speciesName}`} className="pokemon-card-link">
        <img
          className="card-sprite"
          src={spriteUrl(pokemon.id)}
          alt=""
          width="72"
          height="72"
        />
        <span className="card-dex">#{String(pokemon.id).padStart(4, '0')}</span>
        <span className="card-name">{name}</span>
        {showTypes && pokemon.types?.length ? (
          <span className="card-types">
            {pokemon.types.map((type) => (
              <span key={type.name} className={`type-pill type-${type.name}`}>
                {type.englishName}
              </span>
            ))}
          </span>
        ) : null}
      </Link>
      {hidden ? <span className="hidden-ability">Hidden ability</span> : null}
    </li>
  );
}
