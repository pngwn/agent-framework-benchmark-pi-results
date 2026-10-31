import { Link } from "react-router";
import { dexNumber, humanize } from "../lib/format";
import { TypeBadge } from "./TypeBadge";

export interface CardSpecies {
  id: number;
  name: string;
  types?: string[];
}

/**
 * A Pokémon card: a link to the species page with the front sprite,
 * dex number and humanized species name.
 */
export function PokemonCard({
  species,
  spriteBase,
  showTypes = false,
  extra,
}: {
  species: CardSpecies;
  spriteBase: string;
  showTypes?: boolean;
  extra?: string;
}) {
  return (
    <Link className="card" to={`/pokemon/${species.name}`}>
      <img
        className="card-sprite"
        src={`${spriteBase}/sprites/pokemon/${species.id}.png`}
        alt=""
        width={96}
        height={96}
        loading="lazy"
      />
      <span className="card-dex">{dexNumber(species.id)}</span>
      <span className="card-name">{humanize(species.name)}</span>
      {showTypes && (species.types?.length ?? 0) > 0 ? (
        <span className="card-types">
          {species.types!.map((t) => (
            <TypeBadge key={t} name={t} />
          ))}
        </span>
      ) : null}
      {extra ? <span className="card-extra">{extra}</span> : null}
    </Link>
  );
}

export function PokemonCardList({
  species,
  spriteBase,
  showTypes = false,
  extras,
}: {
  species: CardSpecies[];
  spriteBase: string;
  showTypes?: boolean;
  extras?: Map<number, string>;
}) {
  return (
    <ul className="card-grid">
      {species.map((s) => (
        <li key={s.id}>
          <PokemonCard species={s} spriteBase={spriteBase} showTypes={showTypes} extra={extras?.get(s.id)} />
        </li>
      ))}
    </ul>
  );
}
