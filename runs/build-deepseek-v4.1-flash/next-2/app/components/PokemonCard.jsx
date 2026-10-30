import Link from 'next/link';
import { dexNumber, SPRITE_PLACEHOLDER, typeColorStyle } from '@/lib/format';

export function TypeBadge({ name, children, asLink = false }) {
  const style = typeColorStyle(name);
  if (asLink) {
    return (
      <Link href={`/types/${name}`} className="type-badge type-badge-link" style={style}>
        {children}
      </Link>
    );
  }
  return (
    <span className="type-badge" style={style}>
      {children}
    </span>
  );
}

export function PokemonCard({ id, name, linkName, sprite, types = [], hidden = false }) {
  const hrefName = linkName ?? name;
  return (
    <li className="pokemon-card">
      <Link href={`/pokemon/${hrefName}`} className="pokemon-card-link">
        <img
          className="card-sprite"
          src={sprite || SPRITE_PLACEHOLDER}
          alt=""
          width="96"
          height="96"
          loading="lazy"
        />
        <span className="card-number">{dexNumber(id)}</span>
        <span className="card-name">{name}</span>
        {types.length > 0 && (
          <span className="card-types">
            {types.map((type) => (
              <TypeBadge key={type.name} name={type.name}>
                {type.english}
              </TypeBadge>
            ))}
          </span>
        )}
        {hidden ? <span className="card-note">Hidden ability</span> : null}
      </Link>
    </li>
  );
}
