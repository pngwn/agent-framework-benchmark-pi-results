import { Link } from "react-router";
import type { Card } from "../lib/types";
import { dexNumber } from "../lib/format";
import { TypeBadges } from "./TypeBadge";

export function PokemonCards({
  cards,
  action,
}: {
  cards: Card[];
  action?: (card: Card) => React.ReactNode;
}) {
  return (
    <ul className="card-grid">
      {cards.map((card, i) => (
        <li key={card.id} className={action ? "card-grid__item card-grid__item--action" : undefined}>
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
          {action?.(card)}
        </li>
      ))}
    </ul>
  );
}
