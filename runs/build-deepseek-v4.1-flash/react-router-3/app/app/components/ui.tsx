import { Link } from "react-router";
import { humanize } from "../lib/format";

export function TypeBadge({
  name,
  label,
  link = false,
  className = "",
}: {
  name: string;
  label?: string;
  link?: boolean;
  className?: string;
}) {
  const classes = `type-badge type-${name}${className ? ` ${className}` : ""}`;
  const text = label ?? humanize(name);
  if (link) {
    return (
      <Link className={classes} to={`/types/${name}`}>
        {text}
      </Link>
    );
  }
  return <span className={classes}>{text}</span>;
}

export function PokemonCard({
  card,
  showTypes = false,
}: {
  card: {
    id: number;
    name: string;
    displayName: string;
    sprite: string;
    types?: { name: string; displayName: string }[];
    hidden?: boolean;
  };
  showTypes?: boolean;
}) {
  return (
    <li className="pokemon-card">
      <Link className="pokemon-card-link" to={`/pokemon/${card.name}`}>
        <img
          className="pokemon-card-sprite"
          src={card.sprite}
          alt=""
          width={96}
          height={96}
          loading="lazy"
        />
        <span className="pokemon-card-dex">#{String(card.id).padStart(4, "0")}</span>
        <span className="pokemon-card-name">{card.displayName}</span>
        {showTypes && card.types?.length ? (
          <span className="pokemon-card-types">
            {card.types.map((type) => (
              <TypeBadge
                key={type.name}
                name={type.name}
                label={type.displayName}
              />
            ))}
          </span>
        ) : null}
        {card.hidden ? (
          <span className="pokemon-card-hidden">Hidden ability</span>
        ) : null}
      </Link>
    </li>
  );
}

export function PokemonCardList({
  cards,
  showTypes = false,
}: {
  cards: any[];
  showTypes?: boolean;
}) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard key={`${card.id}-${card.name}`} card={card} showTypes={showTypes} />
      ))}
    </ul>
  );
}
