import { Link } from "react-router";
import type { PokemonCardData } from "../lib/format";
import { TypeBadge } from "./TypeBadge";

type CardPokemon = PokemonCardData & {
  types?: { name: string; label: string; slot?: number }[];
};

export function PokemonCard({
  pokemon,
  showTypes = false,
  hidden = false,
}: {
  pokemon: CardPokemon;
  showTypes?: boolean;
  hidden?: boolean;
}) {
  const dex = `#${String(pokemon.id).padStart(4, "0")}`;
  return (
    <li className="pokemon-card-item">
      <Link className="pokemon-card" to={`/pokemon/${pokemon.name}`}>
        <img
          className="pokemon-card-sprite"
          src={pokemon.sprite}
          alt=""
          width={96}
          height={96}
          loading="lazy"
        />
        <span className="pokemon-dex">{dex}</span>
        <span className="pokemon-card-name">{pokemon.label}</span>
        {showTypes ? (
          <span className="type-badges">
            {(pokemon.types ?? []).map((type) => (
              <TypeBadge key={type.name} name={type.name} label={type.label} />
            ))}
          </span>
        ) : null}
        {hidden ? <span className="hidden-ability">Hidden ability</span> : null}
      </Link>
    </li>
  );
}

export function PokemonCardGrid({
  pokemon,
  showTypes = false,
  hiddenNames,
}: {
  pokemon: CardPokemon[];
  showTypes?: boolean;
  hiddenNames?: Set<string> | string[];
}) {
  const hiddenSet =
    hiddenNames instanceof Set ? hiddenNames : new Set(hiddenNames ?? []);
  return (
    <ul className="card-grid">
      {pokemon.map((entry) => (
        <PokemonCard
          key={entry.id}
          pokemon={entry}
          showTypes={showTypes}
          hidden={hiddenSet.has(entry.name)}
        />
      ))}
    </ul>
  );
}
