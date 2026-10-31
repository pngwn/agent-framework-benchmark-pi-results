import { Link } from 'react-router';
import { dexNumber, humanize } from './util.js';

export function TypeBadge({ type, en }) {
  return <span className={`type-badge type-${type}`}>{en}</span>;
}

/**
 * A list of Pokémon cards: one listitem per card, each a link to the species
 * page containing the front sprite, dex number and humanized name.
 */
export function CardList({ items, apiBase }) {
  return (
    <ul className="card-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link to={`/pokemon/${item.name}`} className="card">
            <img
              src={`${apiBase}/media/sprites/pokemon/${item.id}.png`}
              alt=""
              width="96"
              height="96"
              loading="lazy"
            />
            <span className="card-number">{dexNumber(item.id)}</span>
            <span className="card-name">{humanize(item.name)}</span>
            {item.types ? (
              <span className="card-badges">
                {item.types.map((t) => (
                  <TypeBadge key={t.type} type={t.type} en={t.en} />
                ))}
              </span>
            ) : null}
            {item.note ? <span className="card-note">{item.note}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A region whose accessible name comes from its heading. */
export function Section({ id, title, className = '', children }) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} id={id} className={`panel ${className}`}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}
