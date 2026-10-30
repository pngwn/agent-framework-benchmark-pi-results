import Link from 'next/link';
import { dexNumber } from '@/lib/format';
import TypeBadge from './TypeBadge';

export interface CardType {
  name: string;
  label: string;
}

export default function PokemonCard({
  id,
  slug,
  name,
  spriteUrl,
  types,
  hidden = false,
}: {
  id: number;
  slug: string;
  name: string;
  spriteUrl: string;
  types?: CardType[];
  hidden?: boolean;
}) {
  return (
    <li>
      <Link className="card-link" href={`/pokemon/${slug}`}>
        <img className="card-sprite" src={spriteUrl} alt={name} width={96} height={96} loading="lazy" />
        <span className="dex-number">{dexNumber(id)}</span>
        <span className="card-name">{name}</span>
        {hidden ? <span className="hidden-label">Hidden ability</span> : null}
        {types && types.length > 0 ? (
          <span className="type-badges">
            {types.map((type) => (
              <TypeBadge key={type.name} name={type.name} label={type.label} />
            ))}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
