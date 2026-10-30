import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Card } from "../lib/types";
import { dexNumber } from "../lib/format";
import { TypeBadges } from "./TypeBadge";

type Props = { cards: Card[]; itemExtra?: (card: Card) => ReactNode };

export function PokemonCards({ cards, itemExtra }: Props) {
  return (
    <ul className="card-grid">
      {cards.map((card, i) => (
        <li key={card.id} className={itemExtra ? "card-item card-item--action" : undefined}>
          <Link to={`/pokemon/${card.name}`} className="card">
            <img
              className="card__sprite"
              src={card.sprite}
              alt=""
              width={96}
              height={96}
              loading={i < 12 ? "eager" : "lazy"}
            />
            <span className="card__dex">{dexNumber(card.id)}</span>
            <span className="card__name">{card.label}</span>
            {card.types && card.types.length > 0 && <TypeBadges types={card.types} />}
            {card.hidden && <span className="card__note">Hidden ability</span>}
          </Link>
          {itemExtra?.(card)}
        </li>
      ))}
    </ul>
  );
}
