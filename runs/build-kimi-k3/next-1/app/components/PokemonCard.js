import Link from 'next/link';
import { MEDIA_BASE_URL } from 'lib/api';
import { dexNumber, humanize } from 'lib/format';
import { TypeBadges } from 'components/TypeBadge';

export function CardGrid({ children }) {
  return <ul className="cards">{children}</ul>;
}

// A Pokémon card: a link to the species page with the front sprite, the dex
// number and the humanized species name. Optionally shows types (home page)
// or a "Hidden ability" note (ability page).
export function PokemonCard({ id, name, types, hidden }) {
  return (
    <li className="card">
      <Link href={`/pokemon/${name}`} prefetch={false}>
        <img
          src={`${MEDIA_BASE_URL}/sprites/pokemon/${id}.png`}
          alt=""
          width={96}
          height={96}
          loading="lazy"
        />
        <span className="card-dex">{dexNumber(id)}</span>
        <span className="card-name">{humanize(name)}</span>
        <TypeBadges types={types} />
        {hidden && <span className="hidden-note">Hidden ability</span>}
      </Link>
    </li>
  );
}
