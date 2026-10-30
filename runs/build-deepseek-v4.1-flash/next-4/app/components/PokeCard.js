import Link from 'next/link';
import { dexNumber, humanize } from '@/lib/display';
import { spriteUrl } from '@/lib/data';

export default function PokeCard({ species, sprite, types = [], showTypes = false, hidden = false }) {
  const name = humanize(species.name);
  return (
    <li className="cardItem">
      <Link className="pokeCard" href={`/pokemon/${species.name}`}>
        <img src={sprite || spriteUrl(species.id)} alt="" loading="lazy" />
        <span className="pokeCardNumber">{dexNumber(species.id)}</span>
        <span className="pokeCardName">{name}</span>
        {showTypes && types.length > 0 ? (
          <span className="typeList">
            {types.map((type) => (
              <span className="typeBadge" data-type={type.name} key={type.name}>
                {type.label}
              </span>
            ))}
          </span>
        ) : null}
        {hidden ? <span className="pokeCardHidden">Hidden ability</span> : null}
      </Link>
    </li>
  );
}
