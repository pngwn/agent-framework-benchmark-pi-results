import { Link } from "react-router";
import type { CardData } from "../lib/types";

export function TypeBadge({ name, display }: { name: string; display: string }) {
  return (
    <span className="type-badge" style={{ backgroundColor: `var(--type-${name})` }}>
      {display}
    </span>
  );
}

export function PokemonCard({
  card,
  types,
}: {
  card: CardData;
  types?: { name: string; display: string }[];
}) {
  return (
    <li className="card">
      <Link to={`/pokemon/${card.name}`} className="card-link">
        <img
          src={card.sprite}
          alt=""
          width={96}
          height={96}
          loading="lazy"
          className="card-sprite"
        />
        <span className="card-dex">{card.dex}</span>
        <span className="card-name">{card.display}</span>
        {types && types.length > 0 && (
          <span className="card-types">
            {types.map((t) => (
              <TypeBadge key={t.name} name={t.name} display={t.display} />
            ))}
          </span>
        )}
        {card.hidden && <span className="card-hidden">Hidden ability</span>}
      </Link>
    </li>
  );
}

export function PokemonCardList({ cards }: { cards: CardData[] }) {
  return (
    <ul className="cards">
      {cards.map((card) => (
        <PokemonCard key={card.id} card={card} />
      ))}
    </ul>
  );
}
