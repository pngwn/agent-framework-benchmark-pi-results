import { Link } from "react-router";
import { dexNumber, humanize } from "~/lib/format";
import { TypeBadge } from "./TypeBadge";

type CardPokemon = {
  id: number;
  name: string;
  humanized: string;
  spriteUrl: string;
  types?: string[];
};

type Props = {
  pokemon: CardPokemon;
  showTypes?: boolean;
  hidden?: boolean;
};

export function PokemonCard({ pokemon, showTypes = false, hidden = false }: Props) {
  return (
    <li className="pokemon-card">
      <Link to={`/pokemon/${pokemon.name}`}>
        <img src={pokemon.spriteUrl} alt="" width={96} height={96} loading="lazy" />
        <span className="card-dex">{dexNumber(pokemon.id)}</span>
        <span className="card-name">{pokemon.humanized}</span>
        {showTypes && pokemon.types?.length ? (
          <span className="card-types">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} name={type} label={humanize(type)} />
            ))}
          </span>
        ) : null}
      </Link>
      {hidden ? <span className="card-hidden">Hidden ability</span> : null}
    </li>
  );
}
