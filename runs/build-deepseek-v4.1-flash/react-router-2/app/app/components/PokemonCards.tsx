import { Link } from "react-router";
import { dexNumber } from "../lib/format";

export type PokemonCardData = {
  id: number;
  name: string;
  display: string;
  sprite: string;
  types?: string[];
  hidden?: boolean;
};

export function PokemonCards({
  cards,
  showTypes = false,
  showHidden = false,
  className = "",
}: {
  cards: PokemonCardData[];
  showTypes?: boolean;
  showHidden?: boolean;
  className?: string;
}) {
  return (
    <ul className={`card-grid ${className}`.trim()}>
      {cards.map((card) => (
        <li className="card" key={card.id}>
          <Link className="card-link" to={`/pokemon/${card.name}`}>
            <img
              className="card-sprite"
              src={card.sprite}
              alt=""
              width={96}
              height={96}
            />
            <span className="card-dex">{dexNumber(card.id)}</span>
            <span className="card-name">{card.display}</span>
            {showHidden && card.hidden ? <span className="card-hidden">Hidden ability</span> : null}
            {showTypes && card.types?.length ? (
              <span className="card-types">
                {card.types.map((type) => (
                  <span key={type} className={`type-badge type-${type.toLowerCase()}`}>
                    {type}
                  </span>
                ))}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
