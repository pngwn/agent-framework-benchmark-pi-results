import { Link } from "react-router";
import type { ReactNode } from "react";
import { dexNumber } from "../lib/format";
import type { CardData, TypeRef } from "../lib/data.server";

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="section" id={id} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{title}</h2>
      {children}
    </section>
  );
}

export function TypeBadge({ type }: { type: TypeRef }) {
  return <span className={`badge type-${type.name}`}>{type.label}</span>;
}

export function TypeBadgeLink({ type }: { type: TypeRef }) {
  return (
    <Link className={`badge type-${type.name}`} to={`/types/${type.name}`}>
      {type.label}
    </Link>
  );
}

export function PokemonCard({ card, showTypes = false }: { card: CardData; showTypes?: boolean }) {
  return (
    <li className="card">
      <Link to={`/pokemon/${card.species}`}>
        <img className="card-sprite" src={card.sprite ?? undefined} alt="" width={96} height={96} loading="lazy" />
        <span className="card-dex">{dexNumber(card.id)}</span>
        <span className="card-name">{card.name}</span>
        {showTypes && card.types?.length ? (
          <span className="card-types">
            {card.types.map((t) => (
              <TypeBadge key={t.name} type={t} />
            ))}
          </span>
        ) : null}
        {card.hidden ? <span className="card-note">Hidden ability</span> : null}
      </Link>
    </li>
  );
}

export function CardGrid({
  cards,
  showTypes = false,
}: {
  cards: CardData[];
  showTypes?: boolean;
}) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard key={card.id} card={card} showTypes={showTypes} />
      ))}
    </ul>
  );
}

export function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}
