import Link from 'next/link';
import { dexNumber } from './format.js';

/** A section: region role named by its heading. */
export function Section({ id, labelledBy, title, className, children }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={className ? `section ${className}` : 'section'}>
      <h2 id={labelledBy} className="section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Colored type badge. */
export function TypeBadge({ name, label }) {
  return <span className={`type-badge type-${name}`}>{label}</span>;
}

/** A Pokémon card: link to the species page with sprite, dex number and name. */
export function PokemonCard({ card, showTypes = false }) {
  return (
    <li className="card">
      <Link href={`/pokemon/${card.species}`} className="card-link">
        {card.sprite ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="card-sprite" src={card.sprite} alt="" width="96" height="96" loading="lazy" />
        ) : (
          <span className="card-sprite card-sprite-empty" aria-hidden="true" />
        )}
        <span className="card-dex">{dexNumber(card.id)}</span>
        <span className="card-name">{card.name}</span>
        {showTypes && (
          <span className="card-types">
            {card.types.map((t) => (
              <TypeBadge key={t.name} name={t.name} label={t.label} />
            ))}
          </span>
        )}
        {card.hidden && <span className="card-hidden">Hidden ability</span>}
      </Link>
    </li>
  );
}

/** A list of Pokémon cards: one listitem per card, ordered by dex number. */
export function PokemonCardList({ cards, showTypes = false }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <PokemonCard key={card.id} card={card} showTypes={showTypes} />
      ))}
    </ul>
  );
}

/** Shared not-found content. */
export function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p>
        <Link href="/">Back to the Pokédex</Link>
      </p>
    </>
  );
}
