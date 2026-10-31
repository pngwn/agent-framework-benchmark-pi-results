import { Link } from "react-router";
import { dexNumber, humanize } from "../lib/format";
import { spriteUrl, useApiBase } from "../lib/urls";

/** A section: a region whose accessible name is its heading. */
export function Section({
  id,
  title,
  headingId,
  className,
  children,
}: {
  id?: string;
  title: string;
  headingId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const hId = headingId ?? `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
  return (
    <section id={id} aria-labelledby={hId} className={className ?? "section"}>
      <h2 id={hId}>{title}</h2>
      {children}
    </section>
  );
}

export function TypeBadge({ name, english }: { name: string; english?: string }) {
  return (
    <span
      className="type-badge"
      style={{ backgroundColor: `var(--type-${name}, var(--color-text-muted))` }}
    >
      {english ?? humanize(name)}
    </span>
  );
}

export interface CardData {
  id: number;
  speciesName: string;
  hidden?: boolean;
  types?: { name: string; english: string }[];
}

/** A Pokémon card: link to the species page with sprite, dex number and humanized name. */
export function PokemonCard({ card, showTypes }: { card: CardData; showTypes?: boolean }) {
  const apiBase = useApiBase();
  return (
    <li className="pokemon-card">
      <Link to={`/pokemon/${card.speciesName}`}>
        <img src={spriteUrl(apiBase, card.id)} alt="" width={96} height={96} />
        <span className="pokemon-card-number">{dexNumber(card.id)}</span>
        <span className="pokemon-card-name">{humanize(card.speciesName)}</span>
        {showTypes && card.types ? (
          <span className="pokemon-card-types">
            {card.types.map((t) => (
              <TypeBadge key={t.name} name={t.name} english={t.english} />
            ))}
          </span>
        ) : null}
        {card.hidden ? <span className="pokemon-card-hidden">Hidden ability</span> : null}
      </Link>
    </li>
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

export function PokemonCardList({
  cards,
  showTypes = false,
}: {
  cards: CardData[];
  showTypes?: boolean;
}) {
  return (
    <ul className="pokemon-card-list">
      {cards.map((card) => (
        <PokemonCard key={card.id} card={card} showTypes={showTypes} />
      ))}
    </ul>
  );
}
