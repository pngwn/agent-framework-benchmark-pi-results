import { PokemonCard } from "./PokemonCard";

type CardPokemon = {
  id: number;
  name: string;
  humanized: string;
  spriteUrl: string;
  types?: string[];
  hidden?: boolean;
};

export function PokemonCardGrid({
  pokemon,
  showTypes = false,
  showHidden = false,
}: {
  pokemon: CardPokemon[];
  showTypes?: boolean;
  showHidden?: boolean;
}) {
  return (
    <ul className="card-grid">
      {pokemon.map((entry) => (
        <PokemonCard
          key={entry.id}
          pokemon={entry}
          showTypes={showTypes}
          hidden={showHidden && entry.hidden}
        />
      ))}
    </ul>
  );
}
