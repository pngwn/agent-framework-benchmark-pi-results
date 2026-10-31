import Link from 'next/link';
import { API_BASE } from '../lib/api.js';
import { dexNumber, humanize } from '../lib/format.js';
import TypeBadge from './TypeBadge.jsx';

// A list of Pokémon cards: a `list` with one card per `listitem`, ordered by
// dex number. Each card links to the species page and shows the front sprite,
// the dex number and the humanized species name.
export default function PokemonCards({ items }) {
  return (
    <ul className="cards">
      {items.map((item) => (
        <li className="card" key={item.id}>
          <Link href={`/pokemon/${item.speciesName}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${API_BASE}/media/sprites/pokemon/${item.id}.png`}
              alt=""
              width={96}
              height={96}
            />
            <span className="card-dex">{dexNumber(item.id)}</span>
            <span className="card-name">{humanize(item.speciesName)}</span>
            {item.types?.length > 0 && (
              <span className="card-types">
                {item.types.map((t) => (
                  <TypeBadge key={t.name} name={t.name} label={t.en} />
                ))}
              </span>
            )}
            {item.hidden && <span className="card-hidden">Hidden ability</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
