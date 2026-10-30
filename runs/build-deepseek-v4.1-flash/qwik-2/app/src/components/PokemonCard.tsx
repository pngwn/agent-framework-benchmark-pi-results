import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { dexNumber, humanize } from "../lib/format";
import { TypeBadge } from "./TypeBadge";

export interface PokemonCardData {
  id: number;
  name: string;
  sprite: string;
  hidden?: boolean;
  types?: Array<{ name: string; english: string }>;
}

export const PokemonCard = component$<{
  pokemon: PokemonCardData;
}>(({ pokemon }) => {
  return (
    <li className="pokemon-card">
      <Link className="pokemon-card-link" href={`/pokemon/${pokemon.name}`}>
        <img
          className="pokemon-sprite"
          src={pokemon.sprite}
          alt=""
          width={96}
          height={96}
        />
        <span className="dex-number">{dexNumber(pokemon.id)}</span>
        <span className="pokemon-card-name">{humanize(pokemon.name)}</span>
        {pokemon.types?.length ? (
          <span className="card-types">
            {pokemon.types.map((type) => (
              <TypeBadge
                key={type.name}
                name={type.name}
                label={type.english}
              />
            ))}
          </span>
        ) : null}
      </Link>
      {pokemon.hidden ? (
        <span className="hidden-ability">Hidden ability</span>
      ) : null}
    </li>
  );
});
