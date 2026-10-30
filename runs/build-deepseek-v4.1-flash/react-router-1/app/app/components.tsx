import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { dexNumber, humanize } from './lib/format';

export function Section({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`panel section ${className ?? ''}`}
      aria-labelledby={`${id}-heading`}
    >
      <h2 id={`${id}-heading`}>{title}</h2>
      {children}
    </section>
  );
}

export function TypeBadge({
  name,
  english,
}: {
  name: string;
  english?: string;
}) {
  return (
    <span className={`type-badge type-${name}`}>{english ?? humanize(name)}</span>
  );
}

export type Card = {
  id: number;
  name: string;
  humanized: string;
  sprite: string;
  hidden?: boolean;
};

export function PokemonGrid({
  cards,
  showTypes,
}: {
  cards: Array<Card & { types?: Array<{ name: string; english: string }> }>;
  showTypes?: boolean;
}) {
  return (
    <ul className="pokemon-grid">
      {cards.map((card) => (
        <li key={card.id}>
          <Link className="pokemon-card" to={`/pokemon/${card.name}`}>
            <img
              src={card.sprite}
              alt={card.humanized}
              width={96}
              height={96}
              loading="lazy"
            />
            <span className="card-dex">{dexNumber(card.id)}</span>
            <span className="card-name">{card.humanized}</span>
            {showTypes && card.types?.length ? (
              <span className="card-types">
                {card.types.map((type) => (
                  <TypeBadge key={type.name} name={type.name} english={type.english} />
                ))}
              </span>
            ) : null}
          </Link>
          {card.hidden ? <span className="hidden-ability">Hidden ability</span> : null}
        </li>
      ))}
    </ul>
  );
}

type EvolutionNode = {
  name: string;
  label: string;
  children: EvolutionNode[];
};

export function EvolutionList({ nodes }: { nodes: EvolutionNode[] }) {
  return (
    <ul className="evolution-list">
      {nodes.map((node) => (
        <li key={node.name}>
          <Link to={`/pokemon/${node.name}`}>{humanize(node.name)}</Link>
          {node.children.length ? <EvolutionList nodes={node.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function NotFoundPage() {
  return (
    <>
      <h1>Not found</h1>
      <p>
        <Link to="/">Go to the Pokédex</Link>
      </p>
    </>
  );
}
