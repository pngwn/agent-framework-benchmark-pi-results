import Link from 'next/link';
import { CardData } from '../lib/data';

interface PokemonCardProps {
  card: CardData;
  types?: { name: string; label: string }[];
  hidden?: boolean;
}

export function PokemonCard({ card, types, hidden }: PokemonCardProps) {
  return (
    <li className="card-item">
      <Link href={`/pokemon/${card.nameParam}`} className="card">
        <span className="card-image-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="card-image"
            src={card.sprite}
            alt=""
            width={96}
            height={96}
            loading="lazy"
          />
        </span>
        <span className="card-dex">{card.dex}</span>
        <span className="card-name">{card.label}</span>
        {types && types.length > 0 ? (
          <span className="type-badges">
            {types.map((type) => (
              <span key={type.name} className={`type-badge type-${type.name}`}>
                {type.label}
              </span>
            ))}
          </span>
        ) : null}
        {hidden ? <span className="card-hidden">Hidden ability</span> : null}
      </Link>
    </li>
  );
}

export function CardGrid({
  items,
  showTypes = false,
}: {
  items: { card: CardData; types?: { name: string; label: string }[]; hidden?: boolean }[];
  showTypes?: boolean;
}) {
  return (
    <ul className="card-grid">
      {items.map((item) => (
        <PokemonCard
          key={item.card.id}
          card={item.card}
          types={showTypes ? item.types : undefined}
          hidden={item.hidden}
        />
      ))}
    </ul>
  );
}
